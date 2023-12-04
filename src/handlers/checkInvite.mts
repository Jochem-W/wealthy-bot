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
    const usedInvites = [...currentInvites.values()].filter((invite) => {
      if (invite.uses === null) {
        return false
      }

      const oldUses = Invites.get(invite.code)
      if (oldUses === undefined) {
        return false
      }

      return invite.uses === oldUses + 1
    })

    for (const invite of currentInvites.values()) {
      if (invite.uses === null) {
        continue
      }

      Invites.set(invite.code, invite.uses)
    }

    if (usedInvites.length === 0 || !usedInvites[0]) {
      return
    }

    if (usedInvites.length > 1) {
      return
    }

    const [dbInvite] = await Drizzle.select()
      .from(inviteLinksTable)
      .where(eq(inviteLinksTable.code, usedInvites[0].code))
    if (!dbInvite) {
      return
    }

    const [inviter] = await Drizzle.select()
      .from(usersTable)
      .where(eq(usersTable.discordId, dbInvite.discordId))
    if (!inviter) {
      return
    }

    const [invitee] = await Drizzle.insert(inviteesTable).values({
      discordId: member.id,
      userId: inviter.id,
    })
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
