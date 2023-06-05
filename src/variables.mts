import camelcaseKeys from "camelcase-keys"
import { createSecretKey } from "crypto"
import { z } from "zod"

const model = z
  .object({
    COMMIT_HASH: z.string().optional(),
    DISCORD_BOT_TOKEN: z.string(),
    GITHUB_TOKEN: z.string(),
    NODE_ENV: z.string().optional(),
    HTTP_PORT: z.coerce.number().optional().default(80),
    VERIFICATION_TOKEN: z.string().uuid(),
    SECRET_KEY: z.string(),
    INVITE_URL: z.string().url(),
  })
  .transform((arg) => camelcaseKeys(arg))

export const Variables = await model.parseAsync(process.env)

export const SecretKey = createSecretKey(Variables.secretKey, "utf-8")
