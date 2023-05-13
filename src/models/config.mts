import { readFile } from "fs/promises"
import { z } from "zod"

const model = z.object({
  guildId: z.string(),
  applicationId: z.string(),
  repository: z.object({ name: z.string(), owner: z.string() }),
  restartChannel: z.string(),
})

export const Config = await model.parseAsync(
  JSON.parse(await readFile("config.json", "utf-8"))
)
