import camelcaseKeys from "camelcase-keys"
import { z } from "zod"

const model = z
  .object({
    COMMIT_HASH: z.string().optional(),
    DISCORD_BOT_TOKEN: z.string(),
    GITHUB_TOKEN: z.string(),
    NODE_ENV: z.string().optional(),
    HTTP_PORT: z.coerce.number().optional().default(80),
  })
  .transform((arg) => camelcaseKeys(arg))

export const Variables = await model.parseAsync(process.env)
