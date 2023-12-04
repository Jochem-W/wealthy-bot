import { Drizzle } from "../clients.mjs"
import { inviteMessage } from "../messages/inviteMessage.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { inviteLinksTable, inviteesTable, usersTable } from "../schema.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { Invites } from "./invitesOnStart.mjs"
import { ChannelType } from "discord.js"
import { eq } from "drizzle-orm"

export const CheckInvite = handler({
  event: "guildMemberAdd",
  once: false,
  async handle(member) {
    const currentInvites = await member.guild.invites.fetch()
    const usedInvites = [...Invites.values()].filter(
      (code) => !currentInvites.has(code),
    )

    for (const invite of usedInvites) {
      Invites.delete(invite)
    }

    if (usedInvites.length === 0 || !usedInvites[0]) {
      return
    }

    if (usedInvites.length > 1) {
      return
    }

    const [dbInvite] = await Drizzle.select()
      .from(inviteLinksTable)
      .where(eq(inviteLinksTable.code, usedInvites[0]))
    if (!dbInvite) {
      return
    }

    const [inviter] = await Drizzle.select()
      .from(usersTable)
      .where(eq(usersTable.discordId, dbInvite.discordId))
    if (!inviter) {
      return
    }

    const [invitee] = await Drizzle.insert(inviteesTable)
      .values({
        discordId: member.id,
        userId: inviter.id,
      })
      .returning()
    if (!invitee) {
      return
    }

    const channel = await fetchChannel(
      member.client,
      Config.logs.koFi,
      ChannelType.GuildText,
    )
    await channel.send(inviteMessage(member, { user: inviter, invitee }))
  },
})
