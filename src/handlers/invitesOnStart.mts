import { Drizzle } from "../clients.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { LongTimeout } from "../models/longTimeout.mjs"
import { inviteLinksTable } from "../schema.mjs"
import { DateTime } from "luxon"

export const Invites = new Set<string>()

export const InvitesOnStart = handler({
  event: "ready",
  once: true,
  async handle(client) {
    const guild = await client.guilds.fetch(Config.guild)
    const guildInvites = await guild.invites.fetch()

    const dbInvites = await Drizzle.select().from(inviteLinksTable)
    const dbCodes = new Set(dbInvites.map((invite) => invite.code))

    for (const guildInvite of guildInvites.values()) {
      if (!dbCodes.has(guildInvite.code)) {
        continue
      }

      if (!guildInvite.expiresAt) {
        throw new Error("Invalid guild invites")
      }

      Invites.add(guildInvite.code)
      new LongTimeout(
        () => Invites.delete(guildInvite.code),
        DateTime.fromJSDate(guildInvite.expiresAt).diffNow().toMillis(),
      )
    }
  },
})
