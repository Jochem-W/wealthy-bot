import { Discord, Prisma } from "../clients.mjs"
import { GuildOnlyError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { remove } from "../utilities/arrayUtilities.mjs"
import { embedsLength } from "../utilities/embedUtilities.mjs"
import { expiredMillis } from "../utilities/subscriptionUtilities.mjs"
import type { User } from "@prisma/client"
import type { Invitee } from "@prisma/client"
import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  escapeMarkdown,
  Guild,
  GuildMember,
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

  private memberToString({
    user,
    member,
    invitee,
  }: {
    user?: User & { invitee: Invitee | null }
    member?: GuildMember
    invitee?: Invitee & { user: User }
  }) {
    if (!user) {
      if (!member) {
        return null
      }

      if (invitee) {
        return `- ${userMention(member.id)} invited by ${
          invitee.user.discordId
            ? userMention(invitee.user.discordId)
            : `${invitee.user.name} (${invitee.user.email})`
        }`
      }

      return `- ${userMention(member.id)}`
    }

    let value
    if (member) {
      value = userMention(member.id)
      if (
        member.user.username !== user.name &&
        member.displayName !== user.name
      ) {
        value += ` (${user.name})`
      }
    } else {
      value = `${user.name} (${user.email}`
      if (user.discordId) {
        value += `, ${userMention(user.discordId)}`
      }

      value += ")"
    }

    value += ` paid ${time(user.lastPaymentTime, TimestampStyles.RelativeTime)}`
    value = escapeMarkdown(value)

    value = `- ${value}`
    if (user.invitee) {
      value += `\n - Invited ${userMention(user.invitee.discordId)}`
    }

    if (expiredMillis(user) <= 0) {
      value = strikethrough(value)
    }

    return value
  }

  private async groupMembers(guild: Guild) {
    const categories = new Map<
      string,
      {
        member?: GuildMember
        user?: User & { invitee: Invitee | null }
        invitee?: Invitee & { user: User }
      }[]
    >()
    const miscCategory = "Unlinked/not in server"
    const staffCategory = "Staff without subscription"
    const invitedCategory = "Invited"
    categories.set(miscCategory, [])
    categories.set(staffCategory, [])
    categories.set(invitedCategory, [])

    const users = await Prisma.user.findMany({ include: { invitee: true } })
    for (const [, member] of await guild.members.fetch()) {
      if (member.user.bot) {
        continue
      }

      const user = remove(users, (u) => u.discordId === member.id)
      if (!user) {
        const invitee = await Prisma.invitee.findFirst({
          where: { discordId: member.id },
          include: { user: true },
        })
        if (invitee) {
          categories.get(invitedCategory)?.push({ member, invitee })
          continue
        }

        if (member.permissions.has(PermissionFlagsBits.Administrator)) {
          categories.get(staffCategory)?.push({ member })
          continue
        }

        categories.get(miscCategory)?.push({ member })
        continue
      }

      if (categories.get(user.lastPaymentTier) === undefined) {
        categories.set(user.lastPaymentTier, [])
      }

      categories.get(user.lastPaymentTier)?.push({ member, user })
    }

    categories.get(miscCategory)?.push(...users.map((user) => ({ user })))

    return categories
  }

  private categoriesToMessages(
    categories: Map<
      string,
      { member?: GuildMember; user?: User & { invitee: Invitee | null } }[]
    >
  ) {
    const messages = []
    for (const [name, values] of categories) {
      if (values.length === 0) {
        continue
      }

      let inlineCount = 0

      let message: { embeds: EmbedBuilder[] } = { embeds: [] }
      messages.push(message)

      let embed = new EmbedBuilder()
      message.embeds.push(embed)

      let fieldName = name
      let fieldValue = ""
      for (const rawValue of values) {
        const value = this.memberToString(rawValue)
        if (!value) {
          continue
        }

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
            if (inlineCount === 2) {
              embed.addFields({ name: "\u200b", value: "\u200b" })
              inlineCount = 0
            }

            embed.addFields({
              name: fieldName,
              value: fieldValue,
              inline: true,
            })
            inlineCount++
          }

          message = { embeds: [] }
          messages.push(message)
          inlineCount = 0
          embed = new EmbedBuilder()
          message.embeds.push(embed)
          fieldName = name
          fieldValue = ""
        } else if (nextFieldValueLength > 1024) {
          if (inlineCount === 2) {
            embed.addFields({ name: "\u200b", value: "\u200b" })
            inlineCount = 0
          }

          embed.addFields({ name: fieldName, value: fieldValue, inline: true })
          inlineCount++
          fieldName = "\u200b"
          fieldValue = ""
        }

        fieldValue += `\n${value}`
        fieldValue = fieldValue.trim()
      }

      if (fieldValue) {
        if (inlineCount === 2) {
          embed.addFields({ name: "\u200b", value: "\u200b" })
          inlineCount = 0
        }

        embed.addFields({ name: fieldName, value: fieldValue, inline: true })
      }
    }

    return messages
  }

  private async list(
    interaction: ChatInputCommandInteraction<"raw" | "cached">
  ) {
    const guild =
      interaction.guild ?? (await Discord.guilds.fetch(interaction.guildId))

    const categories = await this.groupMembers(guild)
    const messages = this.categoriesToMessages(categories)

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
        break
      }
      default:
        break
    }
  }
}
