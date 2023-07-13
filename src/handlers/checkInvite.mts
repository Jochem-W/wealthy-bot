import { Prisma } from "../clients.mjs"
import { inviteMessage } from "../messages/inviteMessage.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { ChannelType } from "discord.js"

export const CheckInvite = handler({
  event: "guildMemberAdd",
  once: false,
  async handle(member) {
    const invitee = await Prisma.invitee.findFirst({
      where: { discordId: member.id },
      include: { user: true },
    })
    if (!invitee) {
      return
    }

    const channel = await fetchChannel(
      Config.loggingChannel,
      ChannelType.GuildText
    )
    await channel.send(inviteMessage(member, invitee))
  },
})
