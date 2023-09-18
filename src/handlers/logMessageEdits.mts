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

export const LogMessageEdits = handler({
  event: "messageUpdate",
  once: false,
  async handle(oldMessage, newMessage) {
    if (newMessage.partial) {
      // eslint-disable-next-line require-atomic-updates, no-param-reassign
      newMessage = await newMessage.fetch()
    }

    if (newMessage.author.bot) {
      return
    }

    const channel = await fetchChannel(
      newMessage.client,
      Config.logs.messages,
      ChannelType.GuildText,
    )

    const components = [
      new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
        new ButtonBuilder()
          .setEmoji("🔗")
          .setLabel("Go to message")
          .setStyle(ButtonStyle.Link)
          .setURL(newMessage.url),
      ),
    ]

    const embeds = newMessage.attachments
      .filter(
        (attachment) =>
          attachment.contentType &&
          new MIMEType(attachment.contentType).type === "image",
      )
      .map((attachment) =>
        new EmbedBuilder().setImage(attachment.url).setURL(newMessage.url),
      )

    let [firstEmbed] = embeds
    if (!firstEmbed) {
      firstEmbed = new EmbedBuilder()
      embeds.push(firstEmbed)
    }

    firstEmbed
      .setAuthor({
        name: newMessage.author.displayName,
        iconURL: newMessage.author.displayAvatarURL({ size: 4096 }),
      })
      .setTitle("✏️ Message edited")
      .setFooter({ text: newMessage.id })
      .setTimestamp(Date.now())
      .setColor(0xf59e0b)
      .setFields(
        {
          name: "Before",
          value: oldMessage.partial
            ? italic("Not cached")
            : oldMessage.content.substring(0, 1024) || "\u200b",
        },
        {
          name: "After",
          value: newMessage.content.substring(0, 1024) || "\u200b",
        },
      )

    firstEmbed.addFields(
      {
        name: "User",
        value: userMention(newMessage.author.id),
        inline: true,
      },
      { name: "User ID", value: newMessage.author.id, inline: true },
      {
        name: "Channel",
        value: channelMention(newMessage.channelId),
        inline: true,
      },
    )

    if (newMessage.attachments.size > 0) {
      firstEmbed.addFields({
        name: "Attachments",
        value: newMessage.attachments
          .map(
            (attachment) => `- ${hyperlink(attachment.name, attachment.url)}`,
          )
          .join("\n"),
      })
    }

    await channel.send({ embeds, components })
  },
})
