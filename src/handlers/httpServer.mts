/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { logError } from "../errors.mjs"
import { handler } from "../models/handler.mjs"
import { webhook } from "../models/patreon.mjs"
import { Variables } from "../variables.mjs"
import type { Client } from "discord.js"
import { createServer, IncomingMessage, ServerResponse } from "http"

export const Server = createServer()

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

async function endHandler(
  _client: Client<true>,
  _request: IncomingMessage,
  response: ServerResponse,
  body: string,
) {
  try {
    const data = await webhook.safeParseAsync(JSON.parse(body))
    if (!data.success || data.error) {
      console.log(data)
      badRequest(response, `Invalid data ${data.error.toString()}`)
      return
    }

    ok(response)
  } catch (e) {
    badRequest(response)
    console.log(e)
  }
}

async function requestHandler(
  client: Client<true>,
  request: IncomingMessage,
  response: ServerResponse,
) {
  try {
    if (!request.url) {
      badRequest(response, "No URL")
      return
    }

    if (!request.headers.host) {
      badRequest(response, "No Host")
      return
    }

    if (request.headers["user-agent"] !== "Patreon HTTP Robot") {
      badRequest(
        response,
        `Invalid User-Agent ${request.headers["user-agent"]}`,
      )
      return
    }

    if (request.headers["content-type"] !== "application/json") {
      badRequest(
        response,
        `Invalid Content-Type ${request.headers["content-type"]}`,
      )
      return
    }

    const url = new URL(
      request.url,
      `https://${request.headers.host}`,
    ).toString()
    if (url !== Variables.webhookUrl) {
      badRequest(response, `Invalid URL ${url} !== ${Variables.webhookUrl}`)
      return
    }

    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      void endHandler(client, request, response, body)
    })
  } catch (e) {
    badRequest(response)
    if (e instanceof Error) {
      await logError(client, e)
    }
  }
}

export const HttpServer = handler({
  event: "ready",
  once: true,
  handle(client) {
    Server.on("error", (e) => {
      void logError(client, e)
    })
    Server.on("request", (request, response) => {
      void requestHandler(client, request, response)
    })
    Server.on("listening", () => console.log("Listening on", Server.address()))
    Server.listen(Variables.httpPort)
  },
})
