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

export const LogLeaves = handler({
  event: "guildMemberRemove",
  once: false,
  async handle(member) {
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

    await channel.send({ embeds: [embed] })
  },
})
