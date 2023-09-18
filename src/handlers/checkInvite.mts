import { Drizzle } from "../clients.mjs"
import { inviteMessage } from "../messages/inviteMessage.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { inviteesTable, usersTable } from "../schema.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { ChannelType } from "discord.js"
import { eq } from "drizzle-orm"

export const CheckInvite = handler({
  event: "guildMemberAdd",
  once: false,
  async handle(member) {
    const [inviteeData] = await Drizzle.select()
      .from(inviteesTable)
      .where(eq(inviteesTable.discordId, member.id))
      .innerJoin(usersTable, eq(usersTable.id, inviteesTable.userId))
    if (!inviteeData) {
      return
    }

    const channel = await fetchChannel(
      member.client,
      Config.logs.koFi,
      ChannelType.GuildText,
    )
    await channel.send(inviteMessage(member, inviteeData))
  },
})
