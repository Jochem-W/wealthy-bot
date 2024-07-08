/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle } from "../clients.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { invitesTable } from "../schema.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import {
  ChannelType,
  EmbedBuilder,
  TimestampStyles,
  roleMention,
  time,
  userMention,
} from "discord.js"
import { eq } from "drizzle-orm"

export const LogLeaves = handler({
  event: "guildMemberRemove",
  once: false,
  async handle(member) {
    if (member.guild.id !== Config.guild) {
      return
    }

    const channel = await fetchChannel(
      member.client,
      Config.logs.members,
      ChannelType.GuildText,
    )

    const user = await member.user.fetch(true)

    const embed = new EmbedBuilder()
      .setAuthor({
        name: user.displayName,
        iconURL: user.displayAvatarURL({ size: 4096 }),
      })
      .setTitle("⬅️ Member left")
      .setDescription(userMention(user.id))
      .setThumbnail(user.displayAvatarURL({ size: 4096 }))
      .setImage(user.bannerURL({ size: 4096 }) ?? null)
      .setFooter({ text: user.id })
      .setTimestamp(Date.now())
      .setColor(0xef4444)

    if (member.joinedAt) {
      embed.setFields({
        name: "Joined",
        value: time(member.joinedAt, TimestampStyles.RelativeTime),
      })
    }

    let omitted = 0
    const roles: string[] = member.roles.cache
      .filter((role) => role.id !== member.guild.roles.everyone.id)
      .map((role) => roleMention(role.id))

    if (roles.join(" ").length > 1024) {
      roles.pop()
      omitted++
      roles.push(`+${omitted}`)
    }

    while (roles.join(" ").length > 1024) {
      roles.pop()
      if (roles.pop() === undefined) {
        break
      }

      omitted++
      roles.push(`+${omitted}`)
    }

    const joined = roles.join(" ")
    if (joined) {
      embed.addFields({ name: "Roles", value: joined })
    }

    const [invite] = await Drizzle.select()
      .from(invitesTable)
      .where(eq(invitesTable.invitee, member.id))

    if (invite) {
      embed.addFields({
        name: "Invited by",
        value: `${userMention(invite.inviter)}`,
        inline: true,
      })
    }

    await channel.send({ embeds: [embed] })
  },
})
