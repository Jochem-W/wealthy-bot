import type { Invitee, User } from "@prisma/client"
import type { GuildMember } from "discord.js"
import { EmbedBuilder, userMention } from "discord.js"

export function inviteMessage(
  member: GuildMember,
  invitee: Invitee & { user: User }
) {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("New user invited")
        .setFields(
          { name: "User", value: userMention(invitee.discordId) },
          {
            name: "Invited by",
            value: invitee.user.discordId
              ? userMention(invitee.user.discordId)
              : invitee.user.name,
          }
        )
        .setThumbnail(member.displayAvatarURL())
        .setTimestamp(Date.now()),
    ],
  }
}
