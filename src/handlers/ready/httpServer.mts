import { Prisma } from "../../clients.mjs"
import { logError } from "../../errors.mjs"
import { didntRenewMessage } from "../../messages/didntRenewMessage.mjs"
import { newSubscriptionMessage } from "../../messages/newSubscriptionMessage.mjs"
import { renewedMessage } from "../../messages/renewedMessage.mjs"
import { tierChangedMessage } from "../../messages/tierChangedMessage.mjs"
import { Config } from "../../models/config.mjs"
import type { Handler } from "../../types/handler.mjs"
import { fetchChannel } from "../../utilities/discordUtilities.mjs"
import { Variables } from "../../variables.mjs"
import camelcaseKeys from "camelcase-keys"
import type { Client } from "discord.js"
import { ChannelType } from "discord.js"
import { createServer, IncomingMessage, ServerResponse } from "http"
import { Duration } from "luxon"
import { parse } from "querystring"
import { z } from "zod"

export const Timeouts = new Map<number, NodeJS.Timeout>()
const loggingChannel = await fetchChannel(
  Config.loggingChannel,
  ChannelType.GuildText
)

const donationModel = z
  .object({
    amount: z.coerce.number(),
    email: z.string().email(),
    from_name: z.string(),
    is_first_subscription_payment: z.boolean(),
    is_subscription_payment: z.boolean(),
    kofi_transaction_id: z.string().uuid(),
    tier_name: z.string().nullable(),
    timestamp: z.coerce.date(),
    type: z.string(),
    verification_token: z.string(),
  })
  .transform((arg) => camelcaseKeys(arg))

async function timeoutHandler(id: number) {
  try {
    await Prisma.user.update({ where: { id }, data: { expired: true } })
    await loggingChannel.send(await didntRenewMessage(id))
  } catch (e) {
    if (e instanceof Error) {
      await logError(e)
    }
  }
}

async function processDonation(info: z.infer<typeof donationModel>) {
  if (
    !info.isSubscriptionPayment ||
    !info.tierName ||
    info.type !== "Subscription"
  ) {
    return
  }

  let user = await Prisma.user.findFirst({ where: { email: info.email } })
  if (!user) {
    user = await Prisma.user.create({
      data: {
        email: info.email,
        name: info.fromName,
        expired: false,
        lastPaymentAmount: info.amount,
        lastPaymentId: info.kofiTransactionId,
        lastPaymentTier: info.tierName,
        lastPaymentTime: info.timestamp,
      },
    })
    await loggingChannel.send(newSubscriptionMessage(user))
    const userId = user.id
    Timeouts.set(
      user.id,
      setTimeout(
        () => void timeoutHandler(userId),
        Duration.fromObject({ minutes: 1 }).toMillis() // TODO: change to days
      )
    )
    return
  }

  const timeout = Timeouts.get(user.id)
  if (timeout) {
    clearTimeout(timeout)
    Timeouts.delete(user.id)
  }

  const oldUser = user
  user = await Prisma.user.update({
    where: { email: user.email },
    data: {
      email: info.email,
      name: info.fromName,
      expired: false,
      lastPaymentAmount: info.amount,
      lastPaymentId: info.kofiTransactionId,
      lastPaymentTier: info.tierName,
      lastPaymentTime: info.timestamp,
    },
  })

  if (user.lastPaymentTier !== oldUser.lastPaymentTier) {
    await loggingChannel.send(tierChangedMessage(oldUser, user))
  } else if (oldUser.expired) {
    await loggingChannel.send(renewedMessage(user))
  }

  const userId = user.id
  Timeouts.set(
    userId,
    setTimeout(
      () => void timeoutHandler(userId),
      Duration.fromObject({ minutes: 1 }).toMillis() // TODO: change to days
    )
  )
}

function ok(response: ServerResponse) {
  response.writeHead(200, { "Content-Length": "0" })
  response.end()
}

function badRequest(response: ServerResponse, log?: object | string) {
  if (log) {
    console.log("Bad request", log)
  }

  response.writeHead(400, { "Content-Length": "0" })
  response.end()
}

async function endHandler(response: ServerResponse, body: string) {
  try {
    const formData = parse(body)
    const data = formData["data"]
    if (typeof data !== "string") {
      badRequest(response, body)
      return
    }

    const info = donationModel.parse(JSON.parse(data))
    if (info.verificationToken !== Variables.verificationToken) {
      badRequest(response, "Invalid verification token")
      return
    }

    await processDonation(info)
    ok(response)
  } catch (e) {
    badRequest(response)
    if (e instanceof Error) {
      await logError(e)
    }
  }
}

async function requestHandler(
  request: IncomingMessage,
  response: ServerResponse
) {
  try {
    if (!request.url || !request.headers.host) {
      badRequest(response)
      return
    }

    const url = new URL(request.url, `https://${request.headers.host}`)
    const contentType = request.headers["content-type"]
    if (
      url.pathname !== "/webhook" ||
      contentType !== "application/x-www-form-urlencoded"
    ) {
      badRequest(response, { url, contentType })
      return
    }

    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => void endHandler(response, body))
  } catch (e) {
    badRequest(response)
    if (e instanceof Error) {
      await logError(e)
    }
  }
}

export const HttpServer: Handler<"ready"> = {
  event: "ready",
  once: true,
  handle(_client: Client) {
    const server = createServer()
    server.on("error", (e) => void logError(e))
    server.on(
      "request",
      (request, response) => void requestHandler(request, response)
    )
    server.on("listening", () => console.log("Listening on", server.address()))
    server.listen(Variables.httpPort)
  },
}
