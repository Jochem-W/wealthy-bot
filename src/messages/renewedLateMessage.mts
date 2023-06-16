import type { User } from "@prisma/client"
import type { Invitee } from "@prisma/client"
import { EmbedBuilder, userMention } from "discord.js"

export function renewedLateMessage(user: User & { invitee: Invitee | null }) {
  const embed = new EmbedBuilder()
    .setTitle("Late renewal")
    .setFields(
      {
        name: "Member",
        value: user.discordId ? userMention(user.discordId) : user.name,
      },
      { name: "Tier", value: user.lastPaymentTier }
    )
    .setTimestamp(user.lastPaymentTime)

  if (user.invitee) {
    embed.addFields({
      name: "Invited",
      value: userMention(user.invitee.discordId),
    })
  }

  return { embeds: [embed] }
}
