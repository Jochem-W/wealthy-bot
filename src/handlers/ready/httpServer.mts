import { logError } from "../../errors.mjs"
import type { Handler } from "../../types/handler.mjs"
import { Variables } from "../../variables.mjs"
import type { Client } from "discord.js"
import { createServer, IncomingMessage, ServerResponse } from "http"
import { parse } from "querystring"
import { z } from "zod"

const donationModel = z
  .object({
    verification_token: z.string(),
    timestamp: z.coerce.date(),
    type: z.string(),
    from_name: z.string(),
    amount: z.coerce.number(),
    email: z.string().email(),
    is_subscription_payment: z.boolean(),
    is_first_subscription_payment: z.boolean(),
  })
  .transform((arg) => ({
    verificationToken: arg.verification_token,
    timestamp: arg.timestamp,
    type: arg.type,
    fromName: arg.from_name,
    amount: arg.amount,
    email: arg.email,
    isSubscriptionPayment: arg.is_subscription_payment,
    isFirstSubscriptionPayment: arg.is_first_subscription_payment,
  }))

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

function requestHandler(request: IncomingMessage, response: ServerResponse) {
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
    request.on("end", () => {
      try {
        const formData = parse(body)
        const data = formData["data"]
        if (typeof data !== "string") {
          badRequest(response, body)
          return
        }

        const info = donationModel.parse(JSON.parse(data))
        console.log(info)
        ok(response)
      } catch (e) {
        if (e instanceof Error) {
          void logError(e)
        }
      }
    })
  } catch (e) {
    if (e instanceof Error) {
      void logError(e)
    }
  }
}

export const HttpServer: Handler<"ready"> = {
  event: "ready",
  once: true,
  async handle(_client: Client) {
    const server = createServer()
    server.on("error", (e) => void logError(e))
    server.on("request", requestHandler)
    server.on("listening", () => console.log("Listening on", server.address()))
    server.listen(Variables.httpPort)
  },
}
