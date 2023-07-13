import { CheckInvite } from "./handlers/checkInvite.mjs"
import { CheckSubscriptions } from "./handlers/checkSubscriptions.mjs"
import { HttpServer } from "./handlers/httpServer.mjs"
import { InteractionHandler } from "./handlers/interactionHandler.mjs"
import { StartupHandler } from "./handlers/startupHandler.mjs"
import type { Handler } from "./models/handler.mjs"
import type { ClientEvents } from "discord.js"

export const Handlers: Handler<keyof ClientEvents>[] = [
  CheckInvite,
  CheckSubscriptions,
  HttpServer,
  InteractionHandler,
  StartupHandler,
]
