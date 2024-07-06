/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { HttpServer } from "./handlers/httpServer.mjs"
import { InteractionHandler } from "./handlers/interactionHandler.mjs"
import { LogJoins } from "./handlers/logJoins.mjs"
import { LogLeaves } from "./handlers/logLeaves.mjs"
import { LogMessageDelete } from "./handlers/logMessageDelete.mjs"
import { LogMessageEdits } from "./handlers/logMessageEdits.mjs"
import { StarboardHandler } from "./handlers/starboard.mjs"
import { StartupHandler } from "./handlers/startupHandler.mjs"
import { VoiceLogsHandler } from "./handlers/voiceLogsHandler.mjs"
import type { Handler } from "./models/handler.mjs"
import type { ClientEvents } from "discord.js"

export const Handlers: Handler<keyof ClientEvents>[] = [
  HttpServer,
  InteractionHandler,
  StartupHandler,
  LogJoins,
  LogLeaves,
  LogMessageDelete,
  LogMessageEdits,
  VoiceLogsHandler,
  StarboardHandler,
]
