/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import {
  ChannelType,
  EmbedBuilder,
  TimestampStyles,
  time,
  userMention,
} from "discord.js"

export const LogJoins = handler({
  event: "guildMemberAdd",
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

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setAuthor({
            name: user.displayName,
            iconURL: user.displayAvatarURL({ size: 4096 }),
          })
          .setTitle("➡️ Member joined")
          .setDescription(userMention(user.id))
          .setFields({
            name: "Account created",
            value: time(user.createdAt, TimestampStyles.RelativeTime),
          })
          .setThumbnail(user.displayAvatarURL({ size: 4096 }))
          .setImage(user.bannerURL({ size: 4096 }) ?? null)
          .setFooter({ text: user.id })
          .setTimestamp(member.joinedAt)
          .setColor(0x22c55e),
      ],
    })
  },
})
