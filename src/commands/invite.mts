/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle } from "../clients.mjs"
import { Invites } from "../handlers/invitesOnStart.mjs"
import { InteractionContext, InstallationContext } from "../models/command.mjs"
import { Config } from "../models/config.mjs"
import { slashCommand } from "../models/slashCommand.mjs"
import { invitesTable, inviteLinksTable } from "../schema.mjs"
import {
  DiscordAPIError,
  EmbedBuilder,
  RESTJSONErrorCodes,
  userMention,
} from "discord.js"
import { eq } from "drizzle-orm"
import { Duration } from "luxon"

export const InviteCommand = slashCommand({
  name: "invite",
  description: "Invite a user to the server",
  defaultMemberPermissions: null,
  contexts: [InteractionContext.Guild],
  integrationTypes: [InstallationContext.GuildInstall],
  nsfw: false,
  async handle(interaction) {
    if (!interaction.inCachedGuild()) {
      return
    }

    const [oldInvite] = await Drizzle.select()
      .from(invitesTable)
      .where(eq(invitesTable.inviter, interaction.user.id))

    if (oldInvite) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("You're not allowed to create an invite")
            .setDescription(
              `Currently, you're not allowed to create an invite link, because you previously invited ${userMention(oldInvite.invitee)}.`,
            )
            .setColor(0xff0000),
        ],
        ephemeral: true,
      })
      return
    }

    const oldInviteLinks = await Drizzle.delete(inviteLinksTable)
      .where(eq(inviteLinksTable.inviter, interaction.user.id))
      .returning()
    for (const oldInvite of oldInviteLinks) {
      Invites.delete(oldInvite.code)

      try {
        await interaction.guild.invites.delete(
          oldInvite.code,
          "User created a new invite",
        )
      } catch (e) {
        if (
          !(e instanceof DiscordAPIError) ||
          e.code !== RESTJSONErrorCodes.UnknownInvite
        ) {
          throw e
        }
      }
    }

    const guildInvite = await interaction.guild.invites.create(
      Config.channels.invite,
      {
        maxAge: Duration.fromObject({ hours: 12 }).as("seconds"),
        maxUses: 1,
        unique: true,
        reason: "User created a new invite",
      },
    )
    Invites.add(guildInvite.code)

    await Drizzle.insert(inviteLinksTable).values({
      inviter: interaction.user.id,
      code: guildInvite.code,
    })

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Invite link generated")
          .setDescription(
            `To invite someone to the server, please send them the following link:`,
          )
          .setFields({ name: "Invite link", value: guildInvite.url })
          .setFooter({
            text: "This link will be valid for 12 hours. You'll be able to create a new link if the link doesn't get used.",
          }),
      ],
      ephemeral: true,
    })
  },
})
