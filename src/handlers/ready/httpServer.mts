import { logError } from "../../errors.mjs"
import type { Handler } from "../../types/handler.mjs"
import { Variables } from "../../variables.mjs"
import type { Client } from "discord.js"
import { createServer, ServerResponse } from "http"
import { parse } from "querystring"

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
        console.log(formData["data"])
        ok(response)
      })
    })
    server.on("listening", () => console.log("Listening on", server.address()))
    server.listen(Variables.httpPort)
  },
}
