import { Prisma } from "../../clients.mjs"
import { logError } from "../../errors.mjs"
import { didntRenewMessage } from "../../messages/didntRenewMessage.mjs"
import { Config } from "../../models/config.mjs"
import type { Handler } from "../../types/handler.mjs"
import { fetchChannel } from "../../utilities/discordUtilities.mjs"
import { expiredMillis } from "../../utilities/subscriptionUtilities.mjs"
import { ChannelType } from "discord.js"
import { Duration } from "luxon"

const textChannel = await fetchChannel(
  Config.loggingChannel,
  ChannelType.GuildText
)

const interval = Duration.fromObject({ minutes: 1 }).toMillis()

async function callback() {
  try {
    for (const user of await Prisma.user.findMany()) {
      const millis = expiredMillis(user)
      if (millis < 0 || millis > interval) {
        continue
      }

      await textChannel.send(didntRenewMessage(user))
    }
  } catch (e) {
    if (e instanceof Error) {
      await logError(e)
    }
  }
}

export const CheckSubscriptions: Handler<"ready"> = {
  event: "ready",
  once: true,
  async handle() {
    setInterval(() => void callback(), interval)
    await callback()
  },
}
