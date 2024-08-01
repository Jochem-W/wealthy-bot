/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle } from "../clients.mjs"
import { Colours } from "../colours.mjs"
import { InteractionContext, InstallationContext } from "../models/command.mjs"
import { slashCommand, slashSubcommand } from "../models/slashCommand.mjs"
import { starboardConfiguration } from "../schema.mjs"
import {
  ChannelType,
  EmbedBuilder,
  Guild,
  PermissionFlagsBits,
  TextChannel,
  channelMention,
  inlineCode,
} from "discord.js"
import { desc } from "drizzle-orm"
import emojiRegex from "emoji-regex"

const regex = emojiRegex()

function parseEmoji(guild: Guild, emoji: string | null) {
  if (!emoji) {
    return null
  }

  const unicodeEmoji = emoji.match(regex)
  if (unicodeEmoji && unicodeEmoji[0]) {
    return unicodeEmoji[0]
  }

  const guildEmoji = emoji.match(/<a?:[\w-]+:(\d+)>/)
  if (!guildEmoji || !guildEmoji[1] || !guild.emojis.cache.has(guildEmoji[1])) {
    return null
  }

  return emoji
}

export const StarboardCommand = slashCommand({
  name: "starboard",
  description: "Commands related to starboard functionality",
  contexts: [InteractionContext.Guild],
  integrationTypes: [InstallationContext.GuildInstall],
  nsfw: false,
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  subcommandGroups: [
    {
      name: "config",
      description: "Commands related to starboard configuration",
      subcommands: [
        slashSubcommand({
          name: "edit",
          description: "Change the current starboard configuration",
          options: [
            {
              name: "enabled",
              description: "Sets whether the starboard is enabled",
              type: "boolean",
            },
            {
              name: "threshold",
              description:
                "Sets the minimum amount of reactions for a message to be added to the starboard",
              type: "integer",
            },
            {
              name: "channel",
              description:
                "Sets the channel that starboard messages are sent to",
              type: "channel",
              channelTypes: [
                ChannelType.GuildText,
                ChannelType.GuildAnnouncement,
              ],
            },
            {
              name: "emoji",
              description: "Sets the emoji used for starring messages",
              type: "string",
            },
          ],
          async handle(interaction, enabled, threshold, channel, emoji) {
            if (!interaction.inCachedGuild()) {
              return
            }

            if (emoji) {
              const originalEmoji = emoji
              emoji = parseEmoji(interaction.guild, emoji)
              if (!emoji) {
                await interaction.reply({
                  embeds: [
                    new EmbedBuilder()
                      .setTitle("Invalid emoji")
                      .setDescription(
                        `The emoji ${inlineCode(originalEmoji)} is invalid. Make sure it's an emoji that's built in to Discord or an emoji that's from the current server.`,
                      ),
                  ],
                  ephemeral: true,
                })
                return
              }
            }

            const [configuration] = await Drizzle.select()
              .from(starboardConfiguration)
              .orderBy(desc(starboardConfiguration.timestamp))
              .limit(1)

            channel = channel as TextChannel | null

            const channelId = channel?.id ?? configuration?.channel

            const oldEnabled = configuration?.enabled ?? false
            const oldThreshold = configuration?.threshold ?? 0
            const oldEmoji = configuration?.emoji ?? "⭐"

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

            const [newConfiguration] = await Drizzle.insert(
              starboardConfiguration,
            )
              .values({
                enabled: enabled ?? oldEnabled,
                channel: channelId,
                threshold: threshold ?? oldThreshold,
                emoji: emoji ?? oldEmoji,
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
                    {
                      name: "Emoji",
                      value:
                        emoji !== null
                          ? `${oldEmoji} -> ${emoji}`
                          : `${oldEmoji}`,
                    },
                  ),
              ],
              ephemeral: true,
            })
          },
        }),
        slashSubcommand({
          name: "show",
          description: "Show the current starboard configuration",
          async handle(interaction) {
            const [configuration] = await Drizzle.select()
              .from(starboardConfiguration)
              .orderBy(desc(starboardConfiguration.timestamp))
              .limit(1)

            if (!configuration) {
              await interaction.reply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("Starboard configuration")
                    .setDescription(
                      "The starboard hasn't been configured yet.",
                    ),
                ],
                ephemeral: true,
              })
              return
            }

            await interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Starboard configuration")
                  .setFields(
                    {
                      name: "Enabled",
                      value: configuration.enabled ? "✅" : "❌",
                    },
                    {
                      name: "Channel",
                      value: channelMention(configuration.channel),
                    },
                    {
                      name: "Threshold",
                      value: inlineCode(configuration.threshold.toString(10)),
                    },
                    {
                      name: "Emoji",
                      value: configuration.emoji,
                    },
                  ),
              ],
              ephemeral: true,
            })
          },
        }),
      ],
    },
  ],
})
