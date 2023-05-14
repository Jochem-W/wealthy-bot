import type { User } from "@prisma/client"
import { EmbedBuilder, time, TimestampStyles, userMention } from "discord.js"

export function didntRenewMessage(user: User) {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("Subscription not renewed")
        .setFields(
          {
            name: user.discordId ? "Member" : "Email",
            value: user.discordId ? userMention(user.discordId) : user.email,
          },
          { name: "Tier", value: user.lastPaymentTier },
          {
            name: "Last paid",
            value: `${time(
              user.lastPaymentTime,
              TimestampStyles.ShortDate
            )} (${time(user.lastPaymentTime, TimestampStyles.RelativeTime)})`,
          }
        )
        .setColor(0xff0000),
    ],
  }
}
