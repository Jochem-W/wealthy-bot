import { inviteesTable, usersTable } from "../schema.mjs"
import type { GuildMember } from "discord.js"
import { EmbedBuilder, userMention } from "discord.js"

export function inviteMessage(
  member: GuildMember,
  {
    user,
    invitee,
  }: {
    user: typeof usersTable.$inferSelect
    invitee: typeof inviteesTable.$inferSelect
  },
) {
  const embed = new EmbedBuilder()
    .setTitle("New user invited")
    .setFields({ name: "Invitee", value: userMention(invitee.discordId) })
    .setThumbnail(member.displayAvatarURL())
    .setTimestamp(Date.now())

  let name = "Invited by"
  if (user.discordId) {
    embed.addFields({
      name,
      value: userMention(user.discordId),
      inline: true,
    })

    name = "\u200b"
  }

  embed.addFields({
    name,
    value: user.name,
  })

  return { embeds: [embed] }
}
