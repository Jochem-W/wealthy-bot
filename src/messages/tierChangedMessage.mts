import { inviteesTable, usersTable } from "../schema.mjs"
import { EmbedBuilder, userMention } from "discord.js"

export function tierChangedMessage(
  oldUser: typeof usersTable.$inferSelect,
  newUser: {
    user: typeof usersTable.$inferSelect
    invitee?: typeof inviteesTable.$inferSelect | null
  },
) {
  const embed = new EmbedBuilder()
    .setTitle("Tier changed")
    .setTimestamp(newUser.user.lastPaymentTimestamp)

  if (newUser.user.discordId) {
    embed.addFields({
      name: "Discord user",
      value: userMention(newUser.user.discordId),
      inline: true,
    })
  }

  embed.addFields(
    {
      name: "Ko-fi user",
      value: newUser.user.name,
      inline: true,
    },
    { name: "Old tier", value: oldUser.lastPaymentTier },
    { name: "New tier", value: newUser.user.lastPaymentTier },
  )

  if (newUser.invitee) {
    embed.addFields({
      name: "Invited",
      value: userMention(newUser.invitee.discordId),
    })
    embed.setDescription("Don't forget to check if the invite is still valid.")
  }

  return { embeds: [embed] }
}
