import type { User } from "@prisma/client"
import type { Invitee } from "@prisma/client"
import { EmbedBuilder, time, TimestampStyles, userMention } from "discord.js"

export function didntRenewMessage(user: User & { invitee: Invitee | null }) {
  let description =
    "This could mean that the subscription was cancelled, or that the payment is still pending."

  const embed = new EmbedBuilder()
    .setTitle("Overdue payment")
    .setFields(
      {
        name: "Member",
        value: user.discordId ? userMention(user.discordId) : user.name,
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
    .setColor(0xff0000)

  if (user.invitee) {
    embed.addFields({
      name: "Invited",
      value: userMention(user.invitee.discordId),
    })
    description +=
      " Make sure to check if the invited member should be removed."
  }

  embed.setDescription(description)

  return { embeds: [embed] }
}
