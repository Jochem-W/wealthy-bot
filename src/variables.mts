/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import camelcaseKeys from "camelcase-keys"
import { z } from "zod"

const model = z
  .object({
    DISCORD_BOT_TOKEN: z.string(),
    NODE_ENV: z.string().optional().default("development"),
    HTTP_PORT: z.coerce.number().optional().default(80),
    INVITE_URL: z.string().url(),
    DATABASE_URL: z.string(),
    WEBHOOK_URL: z
      .string()
      .url()
      .transform((arg) => new URL(arg).toString()),
    OPENAI_KEY: z.string(),
  })
  .transform((arg) => camelcaseKeys(arg))

export const Variables = await model.parseAsync(process.env)
