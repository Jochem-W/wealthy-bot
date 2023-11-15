import { Drizzle } from "../clients.mjs"
import { logError } from "../errors.mjs"
import { didntRenewMessage } from "../messages/didntRenewMessage.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { LongTimeout } from "../models/longTimeout.mjs"
import { inviteesTable, usersTable } from "../schema.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { untilExpiredMillis } from "../utilities/subscriptionUtilities.mjs"
import { ChannelType, Client } from "discord.js"
import { eq } from "drizzle-orm"

const timeouts = new Map<number, LongTimeout>()

export function replaceTimeout(
  client: Client<true>,
  user: typeof usersTable.$inferSelect,
) {
  removeTimeout(user.id)
  timeouts.set(
    user.id,
    new LongTimeout(() => {
      callback(client, user.id).catch((e) =>
        e instanceof Error ? logError(client, e) : console.log(e),
      )
    }, untilExpiredMillis(user)),
  )
}

export function removeTimeout(id: number) {
  const value = timeouts.get(id)
  if (!value) {
    return
  }

  value.clear()
  timeouts.delete(id)
}

async function callback(client: Client<true>, id: number) {
  const channel = await fetchChannel(
    client,
    Config.logs.koFi,
    ChannelType.GuildText,
  )

  const [userData] = await Drizzle.select()
    .from(usersTable)
    .where(eq(usersTable.id, id))
    .leftJoin(inviteesTable, eq(inviteesTable.userId, usersTable.id))

  if (!userData) {
    throw new Error("User not found")
  }

  await channel.send(await didntRenewMessage(channel.guild, userData))
}

export const CheckSubscriptions = handler({
  event: "ready",
  once: true,
  async handle(client) {
    for (const user of await Drizzle.select().from(usersTable)) {
      if (untilExpiredMillis(user) <= 0) {
        continue
      }

      replaceTimeout(client, user)
    }
  },
})
