import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { RoleOnJoinHandler } from "./roleOnJoin.mjs"

export const RoleOnStartHandler = handler({
  event: "ready",
  once: true,
  async handle(client) {
    const guild = await client.guilds.fetch(Config.guild)
    for (const [, member] of await guild.members.fetch({ limit: 1000 })) {
      await RoleOnJoinHandler.handle(member)
    }
  },
})
