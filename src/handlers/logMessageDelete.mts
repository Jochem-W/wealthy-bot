/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  channelMention,
  hyperlink,
  italic,
  userMention,
} from "discord.js"
import { MIMEType } from "util"

export const LogMessageDelete = handler({
  event: "messageDelete",
  once: false,
  async handle(message) {
    if (message.guild?.id !== Config.guild) {
      return
    }

    if (message.author?.bot) {
      return
    }

    const channel = await fetchChannel(
      message.client,
      Config.logs.messages,
      ChannelType.GuildText,
    )

    const components = [
      new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
        new ButtonBuilder()
          .setEmoji("🔗")
          .setLabel("Go to message")
          .setStyle(ButtonStyle.Link)
          .setURL(message.url),
      ),
    ]

    const embeds = message.attachments
      .filter(
        (attachment) =>
          attachment.contentType &&
          new MIMEType(attachment.contentType).type === "image",
      )
      .map((attachment) =>
        new EmbedBuilder().setImage(attachment.url).setURL(message.url),
      )

    let [firstEmbed] = embeds
    if (!firstEmbed) {
      firstEmbed = new EmbedBuilder()
      embeds.push(firstEmbed)
    }

    firstEmbed
      .setTitle("🗑️ Message deleted")
      .setFooter({ text: message.id })
      .setTimestamp(Date.now())
      .setColor(0xef4444)

    if (message.author) {
      firstEmbed
        .setAuthor({
          name: message.author.displayName,
          iconURL: message.author.displayAvatarURL({ size: 4096 }),
        })
        .addFields(
          { name: "User", value: userMention(message.author.id), inline: true },
          { name: "User ID", value: message.author.id, inline: true },
        )
    }

    if (message.channelId) {
      firstEmbed.addFields({
        name: "Channel",
        value: channelMention(message.channelId),
        inline: true,
      })
    }

    if (message.attachments.size > 0) {
      firstEmbed.addFields({
        name: "Attachments",
        value: message.attachments
          .map(
            (attachment) => `- ${hyperlink(attachment.name, attachment.url)}`,
          )
          .join("\n"),
      })
    }

    if (message.partial) {
      firstEmbed.setDescription(italic("Not cached"))

      await channel.send({ embeds, components })
      return
    }

    firstEmbed.setDescription(message.content.substring(0, 4096) || null)

    await channel.send({ embeds, components })
  },
})
