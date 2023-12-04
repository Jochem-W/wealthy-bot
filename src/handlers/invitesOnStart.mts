import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { Collection } from "discord.js"

export const Invites = new Collection<string, number>()

export const InvitesOnStart = handler({
  event: "ready",
  once: true,
  async handle(client) {
    const guild = await client.guilds.fetch(Config.guild)
    const invites = await guild.invites.fetch()

    for (const [code, invite] of invites.entries()) {
      if (invite.uses === null) {
        continue
      }

      Invites.set(code, invite.uses)
    }
  },
})
