import { Discord, Prisma } from "../clients.mjs"
import { GuildOnlyError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { expiredMillis } from "../utilities/subscriptionUtilities.mjs"
import type { User } from "@prisma/client"
import type { ChatInputCommandInteraction, GuildMember } from "discord.js"
import {
  EmbedBuilder,
  inlineCode,
  PermissionFlagsBits,
  strikethrough,
  time,
  TimestampStyles,
  userMention,
} from "discord.js"

function formatUsers(users: { prismaUser?: User; guildMember: GuildMember }[]) {
  return users.map(({ prismaUser, guildMember }) => {
    if (!prismaUser) {
      return userMention(guildMember.id)
    }

    const string = `${
      prismaUser.discordId
        ? userMention(prismaUser.discordId)
        : inlineCode(prismaUser.email)
    } paid ${time(prismaUser.lastPaymentTime, TimestampStyles.RelativeTime)}`
    if (expiredMillis(prismaUser) < 0) {
      return strikethrough(string)
    }

    return string
  })
}

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

  public async handle(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      throw new GuildOnlyError()
    }

    const guild =
      interaction.guild ?? (await Discord.guilds.fetch(interaction.guildId))

    switch (interaction.options.getSubcommand()) {
      case "list": {
        const koFiMembers = new Map<
          string,
          { prismaUser?: User; guildMember: GuildMember }[]
        >()
        koFiMembers.set("Unknown", [])
        for (const [, guildMember] of await guild.members.fetch()) {
          if (guildMember.user.bot) {
            continue
          }

          const prismaUser = await Prisma.user.findFirst({
            where: { discordId: guildMember.id },
          })
          if (!prismaUser) {
            if (
              !guildMember.permissions.has(PermissionFlagsBits.Administrator)
            ) {
              koFiMembers.get("Unknown")?.push({ guildMember })
            }
            continue
          }

          if (!koFiMembers.get(prismaUser.lastPaymentTier)) {
            koFiMembers.set(prismaUser.lastPaymentTier, [])
          }

          koFiMembers
            .get(prismaUser.lastPaymentTier)
            ?.push({ prismaUser, guildMember })
        }

        const embeds = []
        for (const [tier, users] of koFiMembers) {
          let value = ""
          for (const formatted of formatUsers(users)) {
            if (value.length + formatted.length >= 1024) {
              embeds.push(new EmbedBuilder().setFields({ name: tier, value }))
              value = ""
              continue
            }

            value += formatted + "\n"
          }
          if (value) {
            embeds.push(new EmbedBuilder().setFields({ name: tier, value }))
          }
        }

        await interaction.reply({ embeds, ephemeral: true })
      }
    }
  }
}
