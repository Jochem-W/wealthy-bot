import { Prisma } from "../clients.mjs"
import { logError } from "../errors.mjs"
import { didntRenewMessage } from "../messages/didntRenewMessage.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { LongTimeout } from "../models/longTimeout.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { expiredMillis } from "../utilities/subscriptionUtilities.mjs"
import type { User } from "@prisma/client"
import { ChannelType } from "discord.js"

const timeouts = new Map<number, LongTimeout>()
const textChannel = await fetchChannel(
  Config.loggingChannel,
  ChannelType.GuildText
)

export function replaceTimeout(user: User) {
  removeTimeout(user.id)
  timeouts.set(
    user.id,
    // eslint-disable-next-line no-loop-func
    new LongTimeout(() => {
      callback(user.id).catch((e) =>
        e instanceof Error ? logError(e) : console.log(e)
      )
    }, expiredMillis(user))
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

async function callback(id: number) {
  const user = await Prisma.user.findFirstOrThrow({
    where: { id },
    include: { invitee: true },
  })
  await textChannel.send(didntRenewMessage(user))
}

export const CheckSubscriptions = handler({
  event: "ready",
  once: true,
  async handle() {
    for (const user of await Prisma.user.findMany()) {
      if (expiredMillis(user) <= 0) {
        continue
      }

      replaceTimeout(user)
    }
  },
})
