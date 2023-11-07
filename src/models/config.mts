import { readFile } from "fs/promises"
import { z } from "zod"

const model = z.object({
  applicationId: z.string(),
  assignRoles: z.boolean(),
  channels: z.object({
    error: z.string(),
    restart: z.string(),
  }),
  logs: z.object({
    koFi: z.string(),
    members: z.string(),
    messages: z.string(),
  }),
  gracePeriod: z.number(),
  guild: z.string(),
  repository: z
    .object({
      name: z.string(),
      owner: z.string(),
    })
    .optional(),
  unsubscribed: z.string(),
  exempt: z.string(),
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
