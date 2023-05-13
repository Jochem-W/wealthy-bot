import type { User } from "@prisma/client"
import { EmbedBuilder, userMention } from "discord.js"

export function tierChangedMessage(oldUser: User, newUser: User) {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Subscription tier changed")
        .setFields(
          {
            name: newUser.discordId ? "Member" : "Email",
            value: newUser.discordId
              ? userMention(newUser.discordId)
              : newUser.email,
          },
          { name: "Old tier", value: oldUser.lastPaymentTier },
          { name: "New tier", value: newUser.lastPaymentTier }
        )
        .setTimestamp(newUser.lastPaymentTime),
    ],
  }
}
