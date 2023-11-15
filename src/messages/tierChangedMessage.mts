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
    .setFields(
      {
        name: "Member",
        value: newUser.user.discordId
          ? userMention(newUser.user.discordId)
          : newUser.user.name,
      },
      { name: "Old tier", value: oldUser.lastPaymentTier },
      { name: "New tier", value: newUser.user.lastPaymentTier },
    )
    .setTimestamp(newUser.user.lastPaymentTimestamp)

  if (newUser.invitee) {
    embed.addFields({
      name: "Invited",
      value: userMention(newUser.invitee.discordId),
    })
    embed.setDescription(
      "Make sure to check if the invited member should be removed.",
    )
  }

  return { embeds: [embed] }
}
