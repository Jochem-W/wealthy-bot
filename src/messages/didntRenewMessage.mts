import { inviteesTable, usersTable } from "../schema.mjs"
import { EmbedBuilder, Guild, time, TimestampStyles, userMention } from "discord.js"
import { tryFetchMember } from "../utilities/discordUtilities.mjs"

export async function didntRenewMessage(guild: Guild, {
  user,
  invitee,
}: {
  user: typeof usersTable.$inferSelect
  invitee?: typeof inviteesTable.$inferSelect | null
}) {
  let description =
    "This could mean that the subscription was cancelled, or that the payment is still pending."

  let member
  if (user.discordId) {
    member = await tryFetchMember(guild, user.discordId)
  }

  const embed = new EmbedBuilder()
    .setTitle("Overdue payment")
    .setFields(
      {
        name: "Member",
        value: member ? userMention(member.id) : user.name
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
    .setColor(0xff0000)

  if (invitee) {
    embed.addFields({
      name: "Invited",
      value: userMention(invitee.discordId),
    })
    description +=
      " Make sure to check if the invited member should be removed."
  }

  embed.setDescription(description)

  return { embeds: [embed] }
}
