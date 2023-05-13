import { logError } from "../../errors.mjs"
import type { Handler } from "../../types/handler.mjs"
import { Variables } from "../../variables.mjs"
import type { Client } from "discord.js"
import { createServer, ServerResponse } from "http"
import { parse } from "querystring"
import { z } from "zod"

const donationModel = z.object({
  verification_token: z.string(),
  timestamp: z.coerce.date(),
  type: z.string(),
  from_name: z.string(),
  amount: z.coerce.number(),
  email: z.string().email(),
  is_subscription_payment: z.boolean(),
  is_first_subscription_payment: z.boolean(),
})

function ok(response: ServerResponse) {
  response.writeHead(200, { "Content-Length": "0" })
  response.end()
}

function badRequest(response: ServerResponse) {
  response.writeHead(400, { "Content-Length": "0" })
  response.end()
}

export const HttpServer: Handler<"ready"> = {
  event: "ready",
  once: true,
  async handle(_client: Client) {
    const server = createServer()
    server.on("error", (e) => void logError(e))
    server.on("request", (request, response) => {
      if (!request.url || !request.headers.host) {
        badRequest(response)
        return
      }

      const url = new URL(request.url, `https://${request.headers.host}`)
      if (
        url.pathname !== "/webhook" ||
        request.headers["content-type"] !== "application/x-www-form-urlencoded"
      ) {
        badRequest(response)
        return
      }

      let body = ""
      request.on("data", (chunk) => (body += chunk))
      request.on("end", () => {
        const formData = parse(body)
        const data = formData["data"]
        if (typeof data !== "string") {
          badRequest(response)
          return
        }

        const info = donationModel.parse(formData["data"])
        console.log(info)
        ok(response)
      })
    })
    server.on("listening", () => console.log("Listening on", server.address()))
    server.listen(Variables.httpPort)
  },
}
