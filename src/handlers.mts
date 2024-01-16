import { CheckInvite } from "./handlers/checkInvite.mjs"
import { CheckSubscriptions } from "./handlers/checkSubscriptions.mjs"
import { HttpServer } from "./handlers/httpServer.mjs"
import { InteractionHandler } from "./handlers/interactionHandler.mjs"
import { InvitesOnStart } from "./handlers/invitesOnStart.mjs"
import { LogJoins } from "./handlers/logJoins.mjs"
import { LogLeaves } from "./handlers/logLeaves.mjs"
import { LogMessageDelete } from "./handlers/logMessageDelete.mjs"
import { LogMessageEdits } from "./handlers/logMessageEdits.mjs"
import { RoleOnJoin } from "./handlers/roleOnJoin.mjs"
import { RoleOnMemberUpdate } from "./handlers/roleOnMemberUpdate.mjs"
import { RolePeriodic } from "./handlers/rolePeriodic.mjs"
import { StartupHandler } from "./handlers/startupHandler.mjs"
import { voiceInactive } from "./handlers/voiceInactive.mjs"
import { VoiceLogsHandler } from "./handlers/voiceLogsHandler.mjs"
import type { Handler } from "./models/handler.mjs"
import type { ClientEvents } from "discord.js"

export const Handlers: Handler<keyof ClientEvents>[] = [
  CheckInvite,
  CheckSubscriptions,
  HttpServer,
  InteractionHandler,
  StartupHandler,
  LogJoins,
  LogLeaves,
  LogMessageDelete,
  LogMessageEdits,
  RoleOnJoin,
  RoleOnMemberUpdate,
  RolePeriodic,
  InvitesOnStart,
  VoiceLogsHandler,
  voiceInactive,
]
