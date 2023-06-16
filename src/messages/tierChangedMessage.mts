import type { User } from "@prisma/client"
import type { Invitee } from "@prisma/client"
import { EmbedBuilder, userMention } from "discord.js"

export function tierChangedMessage(
  oldUser: User,
  newUser: User & { invitee: Invitee | null }
) {
  const embed = new EmbedBuilder()
    .setTitle("Tier changed")
    .setFields(
      {
        name: "Member",
        value: newUser.discordId
          ? userMention(newUser.discordId)
          : newUser.name,
      },
      { name: "Old tier", value: oldUser.lastPaymentTier },
      { name: "New tier", value: newUser.lastPaymentTier }
    )
    .setTimestamp(newUser.lastPaymentTime)

  if (newUser.invitee) {
    embed.addFields({
      name: "Invited",
      value: userMention(newUser.invitee.discordId),
    })
    embed.setDescription(
      "Make sure to check if the invited member should be removed."
    )
  }

  return { embeds: [embed] }
}
