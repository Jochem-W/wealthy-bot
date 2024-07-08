/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle } from "../clients.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { inviteLinksTable, invitesTable } from "../schema.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { Invites } from "./invitesOnStart.mjs"
import { ChannelType, EmbedBuilder, userMention } from "discord.js"
import { eq } from "drizzle-orm"

export const CheckInvite = handler({
  event: "guildMemberAdd",
  once: false,
  async handle(member) {
    if (member.guild.id !== Config.guild) {
      return
    }

    const currentInvites = await member.guild.invites.fetch()
    const usedInvites = [...Invites.values()].filter(
      (code) => !currentInvites.has(code),
    )

    for (const invite of usedInvites) {
      Invites.delete(invite)
    }

    if (usedInvites.length === 0 || !usedInvites[0]) {
      return
    }

    if (usedInvites.length > 1) {
      return
    }

    const [dbInvite] = await Drizzle.select()
      .from(inviteLinksTable)
      .where(eq(inviteLinksTable.code, usedInvites[0]))
    if (!dbInvite) {
      return
    }

    const [invite] = await Drizzle.insert(invitesTable)
      .values({
        invitee: member.id,
        inviter: dbInvite.inviter,
      })
      .returning()
    if (!invite) {
      return
    }

    await member.roles.add(Config.roles.invited)

    const channel = await fetchChannel(
      member.client,
      Config.logs.koFi,
      ChannelType.GuildText,
    )

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setTitle("New user invited")
          .setFields(
            { name: "Invitee", value: userMention(invite.invitee) },
            {
              name: "Invited by",
              value: userMention(invite.inviter),
            },
          )
          .setThumbnail(member.displayAvatarURL())
          .setTimestamp(Date.now()),
      ],
    })
  },
})
