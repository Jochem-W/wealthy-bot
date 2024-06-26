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
  gracePeriod: z.number(),
  guild: z.string(),
  repository: z
    .object({
      name: z.string(),
      owner: z.string(),
    })
    .optional(),
  roles: z.object({
    unsubscribed: z.string(),
    exemptNormal: z.string(),
    exemptExtra: z.string(),
    invited: z.string(),
  }),
  tiers: z
    .record(
      z.string(),
      z.object({
        position: z.number(),
        roleId: z.string(),
      }),
    )
    .transform((arg) => new Map(Object.entries(arg))),
})

export const Config = await model.parseAsync(
  JSON.parse(await readFile("config.json", "utf-8")),
)
