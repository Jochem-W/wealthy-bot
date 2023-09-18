import { inviteesTable, usersTable } from "../schema.mjs"
import { EmbedBuilder, userMention } from "discord.js"

export function renewedLateMessage({
  user,
  invitee,
}: {
  user: typeof usersTable.$inferSelect
  invitee?: typeof inviteesTable.$inferSelect
}) {
  const embed = new EmbedBuilder()
    .setTitle("Late renewal")
    .setFields(
      {
        name: "Member",
        value: user.discordId ? userMention(user.discordId) : user.name,
      },
      { name: "Tier", value: user.lastPaymentTier },
    )
    .setTimestamp(user.lastPaymentTimestamp)

  if (invitee) {
    embed.addFields({
      name: "Invited",
      value: userMention(invitee.discordId),
    })
  }

  return { embeds: [embed] }
}
