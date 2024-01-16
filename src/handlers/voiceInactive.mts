import { logError } from "../errors.mjs"
import { handler } from "../models/handler.mjs"
import { GuildMember } from "discord.js"

export const timeouts = new Map<string, NodeJS.Timeout>()

export const voiceInactive = handler({
  event: "voiceStateUpdate",
  once: false,
  async handle(_, after) {
    const member = after.member
    if (!member) {
      return
    }

    clearTimeout(timeouts.get(member.id))
    if (!after.deaf || !after.mute || !after.channel?.userLimit) {
      return
    }

    console.log(member.user.username, "is seemingly AFK")
    timeouts.set(
      member.id,
      setTimeout(() => {
        try {
          void callback(member)
        } catch (e) {
          logError(after.client, e)
        }
      }, after.guild.afkTimeout * 1000),
    )
  },
})

async function callback(member: GuildMember) {
  if (
    !member.voice.deaf ||
    !member.voice.mute ||
    !member.voice.channel?.userLimit
  ) {
    return
  }

  console.log("Moving", member.user.username, "to AFK")
  member.voice.setChannel(member.guild.afkChannel, "Member was AFK")
}
