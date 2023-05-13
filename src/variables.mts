import { z } from "zod"

const model = z
  .object({
    COMMIT_HASH: z.string().optional(),
    DISCORD_BOT_TOKEN: z.string(),
    GITHUB_TOKEN: z.string(),
    NODE_ENV: z.string().optional(),
    HTTP_PORT: z.coerce.number().optional().default(80),
  })
  .transform((arg) => ({
    commitHash: arg.COMMIT_HASH,
    discordBotToken: arg.DISCORD_BOT_TOKEN,
    githubToken: arg.GITHUB_TOKEN,
    nodeEnv: arg.NODE_ENV,
    httpPort: arg.HTTP_PORT,
  }))

export const Variables = await model.parseAsync(process.env)
