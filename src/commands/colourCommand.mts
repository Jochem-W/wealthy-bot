import { Discord } from "../clients.mjs"
import { GuildOnlyError } from "../errors.mjs"
import {
  slashCommand,
  slashOption,
  subcommand,
} from "../models/slashCommand.mjs"
import { EmbedBuilder, SlashCommandStringOption, inlineCode } from "discord.js"

function colorToHex(color: number) {
  return `#${color.toString(16).padStart(6, "0")}`
}

export const ColourCommand = slashCommand({
  name: "colour",
  description: "Change your role colour",
  defaultMemberPermissions: null,
  dmPermission: false,
  subcommands: [
    subcommand({
      name: "set",
      description: "Set your role colour",
      options: [
        slashOption(
          true,
          new SlashCommandStringOption()
            .setName("colour")
            .setDescription("Hex code, with or without the number sign")
        ),
      ],
      async handle(interaction, colour) {
        if (!interaction.inGuild()) {
          throw new GuildOnlyError()
        }

        const guild =
          interaction.guild ?? (await Discord.guilds.fetch(interaction.guildId))
        const member = await guild.members.fetch(interaction.user.id)
        const name = `c${interaction.user.id}`
        let role = member.roles.cache.find((r) => r.name === name)

        const bot = await guild.members.fetchMe()

        let formattedColour = colour
        if (formattedColour.startsWith("#")) {
          formattedColour = formattedColour.substring(1)
        }

        if (formattedColour.length === 8) {
          formattedColour = formattedColour.substring(0, 6)
        }

        const color = parseInt(formattedColour, 16)
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
        formattedColour = colorToHex(color)

        const reason = "Custom role colour changed"
        const embeds = [
          new EmbedBuilder()
            .setTitle("Role colour updated")
            .setDescription(inlineCode(formattedColour))
            .setTimestamp(Date.now())
            .setColor(color),
        ]

        if (role) {
          await role.edit({ reason, color })
          await interaction.reply({ ephemeral: true, embeds })
          return
        }

        role = await guild.roles.create({
          position: Math.min(
            member.roles.highest.position + 1,
            bot.roles.highest.position
          ),
          name,
          reason,
          color,
        })

        await member.roles.add(role)
        await interaction.reply({ ephemeral: true, embeds })
      },
    }),
    subcommand({
      name: "remove",
      description: "Remove your custom role colour",
      async handle(interaction) {
        if (!interaction.inGuild()) {
          throw new GuildOnlyError()
        }

        const guild =
          interaction.guild ?? (await Discord.guilds.fetch(interaction.guildId))
        const member = await guild.members.fetch(interaction.user.id)
        const name = `c${interaction.user.id}`
        const role = member.roles.cache.find((r) => r.name === name)

        if (!role) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("No role colour to remove")
                .setTimestamp(Date.now()),
            ],
            ephemeral: true,
          })
          return
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
      },
    }),
  ],
})
