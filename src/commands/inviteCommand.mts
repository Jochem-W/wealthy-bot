/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle } from "../clients.mjs"
import { Invites } from "../handlers/invitesOnStart.mjs"
import { Config } from "../models/config.mjs"
import { slashCommand } from "../models/slashCommand.mjs"
import { inviteLinksTable, inviteesTable, usersTable } from "../schema.mjs"
import { DiscordAPIError, EmbedBuilder, RESTJSONErrorCodes } from "discord.js"
import { eq } from "drizzle-orm"
import { Duration } from "luxon"

export const InviteCommand = slashCommand({
  name: "invite",
  description: "Invite a user to the server",
  defaultMemberPermissions: null,
  dmPermission: false,
  nsfw: false,
  async handle(interaction) {
    if (!interaction.inCachedGuild()) {
      return
    }

    const [userData] = await Drizzle.select()
      .from(usersTable)
      .where(eq(usersTable.discordId, interaction.user.id))
      .leftJoin(inviteesTable, eq(inviteesTable.userId, usersTable.id))

    if (!userData) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("You're not allowed to create an invite")
            .setDescription(
              "Currently, you're not allowed to create an invite link, since we haven't linked your Ko-fi account to your Discord account in our database. Please DM a staff member for assistance.",
            )
            .setColor(0xff0000),
        ],
        ephemeral: true,
      })
      return
    }

    if (userData.invitee) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("You're not allowed to create an invite")
            .setDescription(
              "Currently, you're not allowed to create an invite link, because you've previously invited someone.",
            )
            .setColor(0xff0000),
        ],
        ephemeral: true,
      })
      return
    }

    const oldInvites = await Drizzle.delete(inviteLinksTable)
      .where(eq(inviteLinksTable.discordId, interaction.user.id))
      .returning()
    for (const oldInvite of oldInvites) {
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

    const invite = await interaction.guild.invites.create(
      Config.channels.invite,
      {
        maxAge: Duration.fromObject({ hours: 12 }).as("seconds"),
        maxUses: 1,
        unique: true,
        reason: "User created a new invite",
      },
    )
    Invites.add(invite.code)

    await Drizzle.insert(inviteLinksTable).values({
      discordId: interaction.user.id,
      code: invite.code,
    })

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Invite link generated")
          .setDescription(
            `To invite someone to the server, please send them the following link:`,
          )
          .setFields({ name: "Invite link", value: invite.url })
          .setFooter({
            text: "This link will be valid for 12 hours. You'll be able to create a new link if the link doesn't get used.",
          }),
      ],
      ephemeral: true,
    })
  },
})
