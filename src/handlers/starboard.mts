/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle } from "../clients.mjs"
import { Colours } from "../colours.mjs"
import { component } from "../models/component.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import {
  starboardConfiguration,
  starboardTable,
  starredTable,
} from "../schema.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  EmbedBuilder,
  GuildEmoji,
  MessageActionRowComponentBuilder,
  ReactionEmoji,
} from "discord.js"
import { desc, eq, countDistinct } from "drizzle-orm"
import { which } from "node-emoji"
import postgres from "postgres"

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
  async handle(reaction, user) {
    const [configuration] = await Drizzle.select()
      .from(starboardConfiguration)
      .orderBy(desc(starboardConfiguration.timestamp))
      .limit(1)
    if (!configuration?.channel) {
      return
    }

    if (reaction.partial) {
      reaction = await reaction.fetch()
    }

    if (reaction.emoji.toString() !== configuration.emoji) {
      return
    }

    let message = reaction.message
    if (message.partial) {
      message = await message.fetch()
    }

    if (message.guildId !== Config.guild) {
      return
    }

    if (reaction.users.cache.size === 0) {
      await reaction.users.fetch({ limit: 100 })
    }

    await Drizzle.insert(starredTable)
      .values([
        ...reaction.users.cache.map((user) => ({
          userId: user.id,
          messageId: message.id,
        })),
        { userId: user.id, messageId: message.id },
      ])
      .onConflictDoNothing()

    const [count] = await Drizzle.select({
      value: countDistinct(starredTable.userId),
    })
      .from(starredTable)
      .where(eq(starredTable.messageId, message.id))

    const countNum = count?.value ?? reaction.count
    if (countNum < configuration.threshold) {
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
            .setCustomId(button())
            .setEmoji(configuration.emoji)
            .setLabel(`${countNum} ${countNum === 1 ? name : name + "s"}`)
            .setStyle(ButtonStyle.Primary),
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
      .where(eq(starboardTable.id, message.id))
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
      id: message.id,
      message: starboardMessage.id,
      channel: starboardMessage.channelId,
    })
  },
})

const button = component({
  type: ComponentType.Button,
  name: "starboard",
  async handle(interaction) {
    if (!interaction.message.components[0]) {
      return
    }

    const [data] = await Drizzle.select()
      .from(starboardTable)
      .where(eq(starboardTable.message, interaction.message.id))

    if (!data) {
      return
    }

    const [count] = await Drizzle.select({
      value: countDistinct(starredTable.userId),
    })
      .from(starredTable)
      .where(eq(starredTable.messageId, data.id))

    if (!count) {
      return
    }

    try {
      await Drizzle.insert(starredTable).values({
        userId: interaction.user.id,
        messageId: data.id,
      })
    } catch (e) {
      if (!(e instanceof postgres.PostgresError) || e.code !== "23505") {
        throw e
      }

      await interaction.reply({
        content: "You've already starred this message!",
        ephemeral: true,
      })
      return
    }

    const row: ActionRowBuilder<MessageActionRowComponentBuilder> =
      ActionRowBuilder.from(interaction.message.components[0])
    const component = row.components[0] as ButtonBuilder
    if (!("label" in component.data)) {
      throw new Error("Button has no label")
    }

    component.setLabel(
      `${count.value + 1} ${component.data.label.split(" ")[1]}`,
    )

    await interaction.update({ components: [row] })
  },
})
