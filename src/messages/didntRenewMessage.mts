import { Prisma } from "../clients.mjs"
import { EmbedBuilder, time, TimestampStyles, userMention } from "discord.js"

export async function didntRenewMessage(id: number) {
  const user = await Prisma.user.findFirstOrThrow({ where: { id } })

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
        .setTimestamp(Date.now())
        .setColor(0xff0000),
    ],
  }
}
