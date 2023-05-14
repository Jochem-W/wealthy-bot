import { AutocompleteHandler } from "./handlers/interactionCreate/autocompleteHandler.mjs"
import { CommandHandler } from "./handlers/interactionCreate/commandHandler.mjs"
import { MessageComponentHandler } from "./handlers/interactionCreate/messageComponentHandler.mjs"
import { ModalHandler } from "./handlers/interactionCreate/modalHandler.mjs"
import { HttpServer } from "./handlers/ready/httpServer.mjs"
import { SetTimeouts } from "./handlers/ready/setTimeouts.mjs"
import { StartupHandler } from "./handlers/ready/startupHandler.mjs"
import type { Handler } from "./types/handler.mjs"
import type { ClientEvents } from "discord.js"

export const Handlers: Handler<keyof ClientEvents>[] = [
  AutocompleteHandler,
  CommandHandler,
  MessageComponentHandler,
  ModalHandler,
  HttpServer,
  StartupHandler,
  SetTimeouts,
]
