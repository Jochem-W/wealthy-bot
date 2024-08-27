/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Colours } from "../colours.mjs"
import { logError } from "../errors.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { pledgeSchema } from "../models/patreon.mjs"
import { fetchChannel } from "../utilities/discordUtilities.mjs"
import { Variables } from "../variables.mjs"
import {
  ChannelType,
  EmbedBuilder,
  hyperlink,
  spoiler,
  userMention,
  type Client,
} from "discord.js"
import { createServer, IncomingMessage, ServerResponse } from "http"
import { z } from "zod"

const triggers = new Set([
  "members:pledge:create",
  "members:pledge:update",
  "members:pledge:delete",
])

export const Server = createServer()

function ok(response: ServerResponse) {
  response.writeHead(200, { "Content-Length": "0" })
  response.end()
}

// function badRequest(response: ServerResponse, log?: object | string) {
//   if (log) {
//     console.log("Bad request", log)
//   }

//   response.writeHead(400, { "Content-Length": "0" })
//   response.end()
// }

async function log(
  client: Client<true>,
  trigger: string,
  payload: z.infer<typeof pledgeSchema>,
) {
  const channel = await fetchChannel(
    client,
    Config.logs.koFi,
    ChannelType.GuildText,
  )

  const userData = payload.included.find((data) => data.type === "user")

  const discordFields = []
  if (userData?.attributes.social_connections.discord) {
    discordFields.push({
      name: "User",
      value: userMention(
        userData.attributes.social_connections.discord.user_id,
      ),
    })
  }

  const tiers = payload.included.filter((obj) => obj.type === "tier")

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`Pledge ${trigger.split(":").at(-1)}d`)
        .setFields(
          { name: "ID", value: payload.data.id },
          {
            name: "Patron",
            value: userData
              ? hyperlink(
                  userData.attributes.full_name,
                  userData.attributes.url,
                )
              : payload.data.attributes.full_name,
          },
          { name: "Email", value: spoiler(payload.data.attributes.email) },
          ...discordFields,
          {
            name: "Entitled tiers",
            value:
              payload.data.relationships.currently_entitled_tiers.data
                .map(
                  (tier) =>
                    `- ${tiers.find((obj) => obj.id === tier.id)?.attributes.title ?? tier.id}`,
                )
                .join("\n") || "None",
          },
        )
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        .setThumbnail(userData?.attributes.image_url || null)
        .setColor(
          trigger === "members:pledge:create"
            ? Colours.green[500]
            : trigger === "members:pledge:update"
              ? Colours.blue[500]
              : Colours.red[500],
        ),
    ],
  })
}

async function endHandler(
  client: Client<true>,
  request: IncomingMessage,
  response: ServerResponse,
  body: string,
) {
  const trigger = request.headers["x-patreon-event"]
  if (!(typeof trigger === "string")) {
    // badRequest(response, `Invalid trigger ${trigger?.toString()}`)
    ok(response)
    return
  }

  if (!triggers.has(trigger)) {
    console.log(`Ignored trigger ${trigger}`)
    ok(response)
    return
  }

  console.log(trigger, body)

  try {
    const payload = await pledgeSchema.safeParseAsync(JSON.parse(body))
    if (!payload.success || payload.error) {
      console.log(payload)
      // badRequest(response, `Invalid data ${payload.error.toString()}`)
      ok(response)
      return
    }

    ok(response)
    await log(client, trigger, payload.data)
  } catch (e) {
    // badRequest(response)
    ok(response)
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
      // badRequest(response, "No URL")
      // return
      console.log("No request URL")
    }

    if (!request.headers.host) {
      // badRequest(response, "No Host")
      // return
      console.log("No host")
    }

    if (request.headers["user-agent"] !== "Patreon HTTP Robot") {
      // badRequest(
      //   response,
      //   `Invalid User-Agent ${request.headers["user-agent"]}`,
      // )
      // return
      console.log("Invalid User-Agent", request.headers["user-agent"])
    }

    if (request.headers["content-type"] !== "application/json") {
      // badRequest(
      //   response,
      //   `Invalid Content-Type ${request.headers["content-type"]}`,
      // )
      // return
      console.log("Invalid Content-Type", request.headers["content-type"])
    }

    if (request.url) {
      const url = new URL(
        request.url,
        `https://${request.headers.host}`,
      ).toString()
      if (url !== Variables.webhookUrl) {
        // badRequest(response, `Invalid URL ${url} !== ${Variables.webhookUrl}`)
        // return
        console.log("Invalid URL", url)
      }
    }

    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      void endHandler(client, request, response, body)
    })
  } catch (e) {
    // badRequest(response)
    ok(response)
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
