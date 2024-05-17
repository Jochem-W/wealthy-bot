/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle } from "../clients.mjs"
import { Colours } from "../colours.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { starboardConfiguration, starboardTable } from "../schema.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  GuildEmoji,
  MessageActionRowComponentBuilder,
  ReactionEmoji,
} from "discord.js"
import { desc, eq } from "drizzle-orm"
import { which } from "node-emoji"

function emojiName(emoji: GuildEmoji | ReactionEmoji) {
  if (!emoji.name) {
    return "star"
  }

  if (emoji.id) {
    return emoji.name
  }

  return which(emoji.name) ?? "star"
}

export const StarboardHandler = handler({
  event: "messageReactionAdd",
  once: false,
  async handle(reaction) {
    const [configuration] = await Drizzle.select()
      .from(starboardConfiguration)
      .orderBy(desc(starboardConfiguration.timestamp))
      .limit(1)
    if (!configuration || !configuration.channel) {
      return
    }

    if (reaction.emoji.toString() !== configuration.emoji) {
      return
    }

    if (reaction.partial) {
      reaction = await reaction.fetch()
    }

    if (reaction.count < configuration.threshold) {
      return
    }

    let message = reaction.message
    if (message.partial) {
      message = await message.fetch()
    }

    if (reaction.message.guildId !== Config.guild) {
      return
    }

    const images = []
    for (const attachment of message.attachments.values()) {
      if (!attachment.contentType?.startsWith("image/")) {
        continue
      }

      images.push(attachment.url)
    }

    for (const embed of message.embeds) {
      if (embed.image) {
        images.push(embed.image.url)
        continue
      }

      if (embed.thumbnail) {
        images.push(embed.thumbnail.url)
        continue
      }
    }

    for (const sticker of message.stickers.values()) {
      images.push(sticker.url)
    }

    const embeds = images
      .slice(0, 10)
      .map((image) =>
        new EmbedBuilder()
          .setURL(message.url)
          .setImage(image)
          .setColor(Colours.amber[500]),
      )

    let firstEmbed = embeds[0]
    if (!firstEmbed) {
      firstEmbed = new EmbedBuilder().setColor(Colours.amber[500])
      embeds.push(firstEmbed)
    }

    firstEmbed
      .setAuthor({
        name: message.author.displayName,
        iconURL: message.author.displayAvatarURL(),
      })
      .setDescription(message.content || null)
      .setTimestamp(message.createdTimestamp)

    const name = emojiName(reaction.emoji)

    const messageData = {
      embeds,
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId("stars")
            .setDisabled(true)
            .setEmoji(configuration.emoji)
            .setLabel(
              `${reaction.count} ${reaction.count === 1 ? name : name + "s"}`,
            )
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setEmoji("🔗")
            .setLabel("Jump to message")
            .setStyle(ButtonStyle.Link)
            .setURL(message.url),
        ),
      ],
    }

    const messageDataWithAttachments = {
      ...messageData,
      files: [
        ...message.attachments
          .filter((attachment) => !attachment.contentType?.startsWith("image/"))
          .values(),
      ],
    }

    const [db] = await Drizzle.select()
      .from(starboardTable)
      .where(eq(starboardTable.id, reaction.message.id))
    if (db) {
      const starboardChannel = await fetchChannel(
        reaction.client,
        db.channel,
        ChannelType.GuildText,
      )
      const starboardMessage = await starboardChannel.messages.fetch(db.message)
      await starboardMessage.edit(messageData)

      return
    }

    const starboardChannel = await fetchChannel(
      reaction.client,
      configuration.channel,
      ChannelType.GuildText,
    )

    const starboardMessage = await starboardChannel.send(
      messageDataWithAttachments,
    )
    await Drizzle.insert(starboardTable).values({
      id: reaction.message.id,
      message: starboardMessage.id,
      channel: starboardMessage.channelId,
    })
  },
})
