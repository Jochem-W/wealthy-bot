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
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("New user invited")
        .setFields(
          { name: "User", value: userMention(invitee.discordId) },
          {
            name: "Invited by",
            value: user.discordId ? userMention(user.discordId) : user.name,
          },
        )
        .setThumbnail(member.displayAvatarURL())
        .setTimestamp(Date.now()),
    ],
  }
}
