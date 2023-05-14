import type { User } from "@prisma/client"
import { EmbedBuilder, userMention } from "discord.js"

export function renewedLateMessage(user: User) {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Subscription renewed late")
        .setFields(
          {
            name: user.discordId ? "Member" : "Email",
            value: user.discordId ? userMention(user.discordId) : user.email,
          },
          { name: "Tier", value: user.lastPaymentTier }
        )
        .setTimestamp(user.lastPaymentTime),
    ],
  }
}
