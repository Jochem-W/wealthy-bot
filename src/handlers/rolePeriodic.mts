import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { RoleOnJoin } from "./roleOnJoin.mjs"
import { Client } from "discord.js"
import { Duration } from "luxon"

async function callback(client: Client<true>) {
  const guild = await client.guilds.fetch(Config.guild)
  const members = await guild.members.fetch({ limit: 1000 })

  for (const member of members.values()) {
    await RoleOnJoin.handle(member)
  }
}

export const RolePeriodic = handler({
  event: "ready",
  once: true,
  handle(client) {
    setInterval(
      () => {
        void callback(client).catch((e) => console.error(e))
      },
      Duration.fromObject({ minutes: 5 }).toMillis(),
    )
  },
})
