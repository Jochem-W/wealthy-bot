import { CheckInvite } from "./handlers/guildMemberAdd/checkInvite.mjs"
import { AutocompleteHandler } from "./handlers/interactionCreate/autocompleteHandler.mjs"
import { CommandHandler } from "./handlers/interactionCreate/commandHandler.mjs"
import { MessageComponentHandler } from "./handlers/interactionCreate/messageComponentHandler.mjs"
import { ModalHandler } from "./handlers/interactionCreate/modalHandler.mjs"
import { CheckSubscriptions } from "./handlers/ready/checkSubscriptions.mjs"
import { HttpServer } from "./handlers/ready/httpServer.mjs"
import { StartupHandler } from "./handlers/ready/startupHandler.mjs"
import type { Handler } from "./types/handler.mjs"
import type { ClientEvents } from "discord.js"

export const Handlers: Handler<keyof ClientEvents>[] = [
  CheckInvite,
  AutocompleteHandler,
  CommandHandler,
  MessageComponentHandler,
  ModalHandler,
  HttpServer,
  StartupHandler,
  CheckSubscriptions,
]
