import { Discord, Prisma } from "../clients.mjs"
import { GuildOnlyError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { embedsLength } from "../utilities/embedUtilities.mjs"
import { expiredMillis } from "../utilities/subscriptionUtilities.mjs"
import type { ChatInputCommandInteraction } from "discord.js"
import {
  EmbedBuilder,
  PermissionFlagsBits,
  strikethrough,
  time,
  TimestampStyles,
  userMention,
} from "discord.js"

export class MembersCommand extends ChatInputCommand {
  public constructor() {
    super(
      "members",
      "Commands related to Ko-fi members",
      PermissionFlagsBits.Administrator
    )
    this.builder.addSubcommand((subcommandGroup) =>
      subcommandGroup.setName("list").setDescription("List all members by tier")
    )
  }

  private async list(
    interaction: ChatInputCommandInteraction<"raw" | "cached">
  ) {
    const guild =
      interaction.guild ?? (await Discord.guilds.fetch(interaction.guildId))

    const categories = new Map<string, string[]>()
    const unknownCategory: string[] = []
    categories.set("Unknown", unknownCategory)

    const users = await Prisma.user.findMany()

    for (const [, member] of await guild.members.fetch()) {
      const userIndex = users.findIndex((u) => u.discordId === member.id)
      const user = users[userIndex]
      if (!user) {
        unknownCategory.push(userMention(member.id))
        continue
      }

      users.splice(userIndex, 1)
      let category = categories.get(user.lastPaymentTier)
      if (!category) {
        category = []
        categories.set(user.lastPaymentTier, category)
      }

      let value = `${userMention(member.id)} (${user.name}) last paid ${time(
        user.lastPaymentTime,
        TimestampStyles.RelativeTime
      )}`
      if (expiredMillis(user) < 0) {
        value = strikethrough(value)
      }

      category.push(value)
    }

    unknownCategory.push(
      ...users.map(
        (u) =>
          `${u.name} (${u.email}) last paid ${time(
            u.lastPaymentTime,
            TimestampStyles.RelativeTime
          )}`
      )
    )

    const messages: { embeds: EmbedBuilder[] }[] = []
    for (const [name, values] of categories) {
      let message = messages.at(-1)
      if (!message) {
        message = { embeds: [] }
        messages.push(message)
      }

      let embed = new EmbedBuilder()
      message.embeds.push(embed)

      let fieldName = name
      let fieldValue = ""
      for (const value of values) {
        let nextFieldValueLength = fieldValue.length + value.length
        if (fieldValue) {
          nextFieldValueLength += 1
        }

        if (
          embedsLength(message.embeds) +
            fieldName.length +
            nextFieldValueLength >
          6000
        ) {
          if (fieldValue) {
            embed.addFields({
              name: fieldName,
              value: fieldValue,
              inline: true,
            })
          }

          message = { embeds: [] }
          messages.push(message)
          embed = new EmbedBuilder()
          message.embeds.push(embed)
          fieldName = name
          fieldValue = ""
        } else if (nextFieldValueLength > 1024) {
          embed.addFields({ name: fieldName, value: fieldValue, inline: true })
          fieldName = "\u200b"
          fieldValue = ""
        }

        fieldValue += `\n${value}`
        fieldValue = fieldValue.trim()
      }

      if (fieldValue) {
        embed.addFields({ name: fieldName, value: fieldValue, inline: true })
      }
    }

    if (!messages[0]) {
      await interaction.reply({
        embeds: [new EmbedBuilder().setTitle("No data")],
      })
      return
    }

    await interaction.reply({ ...messages[0], ephemeral: true })
    for (const message of messages.splice(1)) {
      await interaction.followUp({ ...message, ephemeral: true })
    }
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      throw new GuildOnlyError()
    }

    switch (interaction.options.getSubcommand()) {
      case "list": {
        await this.list(interaction)
      }
    }
  }
}
