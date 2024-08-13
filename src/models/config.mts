/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { readFile } from "fs/promises"
import { z } from "zod"

const model = z.object({
  applicationId: z.string(),
  channels: z.object({
    error: z.string(),
    restart: z.string(),
    invite: z.string(),
  }),
  logs: z.object({
    koFi: z.string(),
    members: z.string(),
    messages: z.string(),
    voice: z.string(),
  }),
  guild: z.string(),
  roles: z.object({
    invited: z.string(),
    subscribed: z.array(z.string()),
    unsubscribed: z.string(),
  }),
})

export const Config = await model.parseAsync(
  JSON.parse(await readFile("config.json", "utf-8")),
)
