import { z } from "zod"

const model = z
  .object({
    COMMIT_HASH: z.string().optional(),
    DISCORD_BOT_TOKEN: z.string(),
    GITHUB_TOKEN: z.string(),
    NODE_ENV: z.string().optional(),
  })
  .transform((c) => ({
    commitHash: c.COMMIT_HASH,
    discordBotToken: c.DISCORD_BOT_TOKEN,
    githubToken: c.GITHUB_TOKEN,
    nodeEnv: c.NODE_ENV,
  }))

export const Variables = await model.parseAsync(process.env)
