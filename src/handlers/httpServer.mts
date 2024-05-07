/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { logError } from "../errors.mjs"
import { handler } from "../models/handler.mjs"
import {
  DonationModel,
  processDonation,
} from "../utilities/subscriptionUtilities.mjs"
import { Variables } from "../variables.mjs"
import type { Client } from "discord.js"
import { createServer, IncomingMessage, ServerResponse } from "http"
import { parse } from "querystring"

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
  client: Client<true>,
  response: ServerResponse,
  body: string,
) {
  try {
    const formData = parse(body)
    const { data } = formData
    if (typeof data !== "string") {
      badRequest(response, body)
      return
    }

    const info = DonationModel.parse(JSON.parse(data))
    if (info.verificationToken !== Variables.verificationToken) {
      badRequest(response, "Invalid verification token")
      return
    }

    await processDonation(client, info)
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
      void endHandler(client, response, body)
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
