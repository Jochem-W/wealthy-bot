/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { InteractionContext, InstallationContext } from "../models/command.mjs"
import { slashCommand, slashSubcommand } from "../models/slashCommand.mjs"
import { interactionMember } from "../utilities/interactionUtilities.mjs"
import { EmbedBuilder, Locale, inlineCode } from "discord.js"

function colorToHex(color: number) {
  return `#${color.toString(16).padStart(6, "0")}`
}

export const ColourCommand = slashCommand({
  name: "colour",
  nameLocalizations: {
    "en-US": "color",
  },
  description: "Change your role colour",
  descriptionLocalizations: {
    "en-US": "Change your role color",
  },
  defaultMemberPermissions: null,
  contexts: [InteractionContext.Guild],
  integrationTypes: [InstallationContext.GuildInstall],
  nsfw: false,
  subcommands: [
    slashSubcommand({
      name: "set",
      description: "Set your role colour",
      descriptionLocalizations: {
        "en-US": "Set your role color",
      },
      options: [
        {
          name: "colour",
          nameLocalizations: {
            "en-US": "color",
          },
          description: "Hex code, with or without the number sign",
          type: "string",
          required: true,
        },
      ],
      async handle(interaction, colour) {
        const member = await interactionMember(interaction, { force: true })
        const name = `c${interaction.user.id}`
        let role = member.guild.roles.cache.find((r) => r.name === name)

        const bot = await member.guild.members.fetchMe()

        let formattedColour = colour
        if (formattedColour.startsWith("#")) {
          formattedColour = formattedColour.substring(1)
        }

        if (formattedColour.length === 8) {
          formattedColour = formattedColour.substring(0, 6)
        }

        const noun =
          interaction.locale === Locale.EnglishUS ? "color" : "colour"

        const color = parseInt(formattedColour, 16)
        if (isNaN(color)) {
          const originalCode = interaction.options.getString("colour", true)
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`Invalid ${noun}`)
                .setDescription(
                  `The ${noun} ${inlineCode(
                    originalCode,
                  )} appears to be invalid.`,
                )
                .setTimestamp(Date.now()),
            ],
            ephemeral: true,
          })
          return
        }
        formattedColour = colorToHex(color)

        const reason = "Custom role colour changed"
        const embeds = [
          new EmbedBuilder()
            .setTitle(`Role ${noun} updated`)
            .setDescription(inlineCode(formattedColour))
            .setTimestamp(Date.now())
            .setColor(color),
        ]

        if (role) {
          await role.edit({ reason, color, permissions: [] })
          if (!member.roles.cache.has(role.id)) {
            await member.roles.add(role)
          }

          await interaction.reply({ ephemeral: true, embeds })
          return
        }

        role = await member.guild.roles.create({
          position: Math.min(
            member.roles.highest.position + 1,
            bot.roles.highest.position,
          ),
          name,
          reason,
          color,
          permissions: [],
        })

        await member.roles.add(role)
        await interaction.reply({ ephemeral: true, embeds })
      },
    }),
    slashSubcommand({
      name: "remove",
      description: "Remove your custom role colour",
      descriptionLocalizations: {
        "en-US": "Remove your custom role color",
      },
      async handle(interaction) {
        const member = await interactionMember(interaction, { force: true })
        const name = `c${interaction.user.id}`
        const role = member.roles.cache.find((r) => r.name === name)

        const noun =
          interaction.locale === Locale.EnglishUS ? "color" : "colour"

        if (!role) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle(`No role ${noun} to remove`)
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
              .setTitle(`Role ${noun} removed`)
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
