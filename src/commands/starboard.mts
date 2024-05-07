/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle } from "../clients.mjs"
import { Colours } from "../colours.mjs"
import { slashCommand, slashSubcommand } from "../models/slashCommand.mjs"
import { starboardConfiguration } from "../schema.mjs"
import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
  channelMention,
  inlineCode,
} from "discord.js"
import { desc } from "drizzle-orm"

export const StarboardCommand = slashCommand({
  name: "starboard",
  description: "Starboard configuration commands",
  dmPermission: false,
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  subcommands: [
    slashSubcommand({
      name: "configure",
      description: "Change starboard configuration",
      options: [
        {
          name: "enabled",
          description: "Sets whether the starboard is enabled",
          type: "boolean",
        },
        {
          name: "threshold",
          description:
            "Sets the minimum amount of reaction for a message to be added to the starboard",
          type: "integer",
        },
        {
          name: "channel",
          description: "Sets the channel that starboard messages are sent to",
          type: "channel",
          channelTypes: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
        },
      ],
      async handle(interaction, enabled, threshold, channel) {
        const [configuration] = await Drizzle.select()
          .from(starboardConfiguration)
          .orderBy(desc(starboardConfiguration.timestamp))
          .limit(1)

        channel = channel as TextChannel | null

        const channelId = channel?.id ?? configuration?.channel

        const oldEnabled = configuration?.enabled ?? false
        const oldThreshold = configuration?.threshold ?? 0

        if (!channelId) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("Invalid configuration")
                .setDescription(
                  "Setting a channel is required for initial configuration!",
                )
                .setColor(Colours.red[500]),
            ],
            ephemeral: true,
          })
          return
        }

        const [newConfiguration] = await Drizzle.insert(starboardConfiguration)
          .values({
            enabled: enabled ?? oldEnabled,
            channel: channelId,
            threshold: threshold ?? oldThreshold,
          })
          .returning()

        if (!newConfiguration) {
          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("Invalid configuration")
                .setDescription(
                  "An error occurred while saving the updated configuration!",
                )
                .setColor(Colours.red[500]),
            ],
            ephemeral: true,
          })
          return
        }

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Updated starboard configuration")
              .setFields(
                {
                  name: "Enabled",
                  value:
                    enabled !== null
                      ? `${oldEnabled ? "✅" : "❌"} -> ${enabled ? "✅" : "❌"}`
                      : `${oldEnabled ? "✅" : "❌"}`,
                },
                {
                  name: "Channel",
                  value: channel
                    ? `${configuration?.channel ? channelMention(configuration.channel) : inlineCode("None")} -> ${channelMention(channel.id)}`
                    : `${configuration?.channel ? channelMention(configuration.channel) : inlineCode("None")}`,
                },
                {
                  name: "Threshold",
                  value:
                    threshold !== null
                      ? `${inlineCode(oldThreshold.toString(10))} -> ${inlineCode(threshold.toString(10))}`
                      : `${inlineCode(oldThreshold.toString(10))}`,
                },
              ),
          ],
          ephemeral: true,
        })
      },
    }),
  ],
})
