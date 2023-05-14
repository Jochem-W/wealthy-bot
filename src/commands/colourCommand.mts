import { Discord } from "../clients.mjs"
import { GuildOnlyError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import type { ChatInputCommandInteraction } from "discord.js"
import { EmbedBuilder, inlineCode } from "discord.js"

function colorToHex(color: number) {
  return `#${color.toString(16).padStart(6, "0")}`
}

export class ColourCommand extends ChatInputCommand {
  public constructor() {
    super("colour", "Change your role colour", null)
    this.builder
      .addSubcommand((subcommandGroup) =>
        subcommandGroup
          .setName("set")
          .setDescription("Set your role colour")
          .addStringOption((builder) =>
            builder
              .setName("colour")
              .setDescription("Hex code, with or without the number sign")
              .setRequired(true)
          )
      )
      .addSubcommand((subcommandGroup) =>
        subcommandGroup
          .setName("remove")
          .setDescription("Remove your custom role colour")
      )
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      throw new GuildOnlyError()
    }

    const guild =
      interaction.guild ?? (await Discord.guilds.fetch(interaction.guildId))
    const member = await guild.members.fetch(interaction.user.id)
    const name = `c${interaction.user.id}`
    let role = member.roles.cache.find((r) => r.name === name)

    const subcommand = interaction.options.getSubcommand()
    switch (subcommand) {
      case "set": {
        let code = interaction.options.getString("colour", true)
        if (code.startsWith("#")) {
          code = code.substring(1)
        }

        if (code.length === 8) {
          code = code.substring(0, 6)
        }

        const color = parseInt(code, 16)
        if (isNaN(color)) {
          const originalCode = interaction.options.getString("colour", true)
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("Invalid colour")
                .setDescription(
                  `The colour ${inlineCode(
                    originalCode
                  )} appears to be invalid.`
                )
                .setTimestamp(Date.now()),
            ],
          })
        }
        code = colorToHex(color)

        const reason = "Custom role colour changed"
        const embeds = [
          new EmbedBuilder()
            .setTitle("Role colour updated")
            .setDescription(inlineCode(code))
            .setTimestamp(Date.now())
            .setColor(color),
        ]

        if (role) {
          await role.edit({ reason, color })
          await interaction.reply({ ephemeral: true, embeds })
          break
        }

        role = await guild.roles.create({
          position: member.roles.highest.position + 1,
          name,
          reason,
          color,
        })

        await member.roles.add(role)
        await interaction.reply({ ephemeral: true, embeds })
        break
      }
      case "remove": {
        if (!role) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("No role colour to remove")
                .setTimestamp(Date.now()),
            ],
            ephemeral: true,
          })
          break
        }

        await role.delete()
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Role colour removed")
              .setDescription(inlineCode(colorToHex(role.color)))
              .setTimestamp(Date.now())
              .setColor(role.color),
          ],
          ephemeral: true,
        })
      }
    }
  }
}
