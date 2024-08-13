/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { CheckInvite } from "./handlers/checkInvite.mjs"
import { HttpServer } from "./handlers/httpServer.mjs"
import { InteractionHandler } from "./handlers/interactionCreate.mjs"
import { InvitesOnStart } from "./handlers/invitesOnStart.mjs"
import { LogJoins } from "./handlers/logJoins.mjs"
import { LogLeaves } from "./handlers/logLeaves.mjs"
import { LogMessageDelete } from "./handlers/logMessageDelete.mjs"
import { LogMessageEdits } from "./handlers/logMessageEdits.mjs"
import { LogVoiceState } from "./handlers/logVoiceState.mjs"
import { RoleOnJoinHandler } from "./handlers/roleOnJoin.mjs"
import { RoleOnStartHandler } from "./handlers/roleOnStart.mjs"
import { RoleOnUpdateHandler } from "./handlers/roleOnUpdate.mjs"
import { StarboardHandler } from "./handlers/starboard.mjs"
import { StartupHandler } from "./handlers/startup.mjs"
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
  LogVoiceState,
  StarboardHandler,
  CheckInvite,
  InvitesOnStart,
  RoleOnJoinHandler,
  RoleOnUpdateHandler,
  RoleOnStartHandler,
]
