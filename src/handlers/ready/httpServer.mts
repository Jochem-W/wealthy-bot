import { logError } from "../../errors.mjs"
import type { Handler } from "../../types/handler.mjs"
import type { Client } from "discord.js"
import { createServer } from "http"

export const HttpServer: Handler<"ready"> = {
  event: "ready",
  once: true,
  async handle(_client: Client) {
    const server = createServer()
    server.on("error", (e) => void logError(e))
    server.on("request", (request, response) => {
      request.on("data", (chunk) => {
        if (chunk instanceof Buffer) {
          chunk = chunk.toString()
        }

        console.log(chunk)
      })

      response.writeHead(200, { "Content-Length": "0" })
      response.end()
    })
    server.on("listening", () => console.log("Listening on", server.address()))
    server.listen()
  },
}
