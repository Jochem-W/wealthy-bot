import { inviteesTable, usersTable } from "../schema.mjs"
import { tryFetchMember } from "../utilities/discordUtilities.mjs"
import {
  EmbedBuilder,
  Guild,
  time,
  TimestampStyles,
  userMention,
} from "discord.js"

export async function didntRenewMessage(
  guild: Guild,
  {
    user,
    invitee,
  }: {
    user: typeof usersTable.$inferSelect
    invitee?: typeof inviteesTable.$inferSelect | null
  },
) {
  let description =
    "Either the subscription was cancelled, or the payment failed."

  let member
  if (user.discordId) {
    member = await tryFetchMember(guild, user.discordId)
  }

  const embed = new EmbedBuilder()
    .setTitle("Overdue payment")
    .setColor(0xff0000)

  if (member) {
    embed.addFields({
      name: "Discord user",
      value: userMention(member.id),
      inline: true,
    })
  }

  embed.addFields(
    {
      name: "Ko-fi user",
      value: user.name,
      inline: true,
    },
    { name: "Tier", value: user.lastPaymentTier },
    {
      name: "Last paid",
      value: `${time(
        user.lastPaymentTimestamp,
        TimestampStyles.ShortDate,
      )} (${time(user.lastPaymentTimestamp, TimestampStyles.RelativeTime)})`,
    },
  )

  if (invitee) {
    embed.addFields({
      name: "Invited user",
      value: userMention(invitee.discordId),
      inline: true,
    })
    description += " Don't forget to check if the invite is still valid."
  }

  embed.setDescription(description)

  return { embeds: [embed] }
}
