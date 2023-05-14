import { Prisma } from "../../clients.mjs"
import type { Handler } from "../../types/handler.mjs"
import { replaceTimeout } from "../../utilities/subscriptionUtilities.mjs"

export const SetTimeouts: Handler<"ready"> = {
  event: "ready",
  once: true,
  async handle() {
    for (const user of await Prisma.user.findMany()) {
      replaceTimeout(user)
    }
  },
}
