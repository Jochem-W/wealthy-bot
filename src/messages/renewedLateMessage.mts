/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { inviteesTable, usersTable } from "../schema.mjs"
import { EmbedBuilder, userMention } from "discord.js"

export function renewedLateMessage({
  user,
  invitee,
}: {
  user: typeof usersTable.$inferSelect
  invitee?: typeof inviteesTable.$inferSelect | null
}) {
  const embed = new EmbedBuilder()
    .setTitle("Late renewal")
    .setTimestamp(user.lastPaymentTimestamp)

  if (user.discordId) {
    embed.addFields({
      name: "Discord user",
      value: userMention(user.discordId),
      inline: true,
    })
  }

  embed.addFields(
    {
      name: "Ko-fi user",
      value: user.name,
      inline: true,
    },
    { name: "Tier", value: user.lastPaymentTier },
  )

  if (invitee) {
    embed.addFields({
      name: "Invited",
      value: userMention(invitee.discordId),
    })
  }

  return { embeds: [embed] }
}
