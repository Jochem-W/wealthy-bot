import { logError } from "../../errors.mjs"
import type { Handler } from "../../types/handler.mjs"
import {
  DonationModel,
  processDonation,
} from "../../utilities/subscriptionUtilities.mjs"
import { Variables } from "../../variables.mjs"
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

async function endHandler(response: ServerResponse, body: string) {
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
    request.on("end", () => {
      void endHandler(response, body)
    })
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
  handle() {
    Server.on("error", (e) => {
      void logError(e)
    })
    Server.on("request", (request, response) => {
      void requestHandler(request, response)
    })
    Server.on("listening", () => console.log("Listening on", Server.address()))
    Server.listen(Variables.httpPort)
  },
}
