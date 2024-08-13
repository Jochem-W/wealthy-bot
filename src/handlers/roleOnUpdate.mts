import { handler } from "../models/handler.mjs"
import { RoleOnJoinHandler } from "./roleOnJoin.mjs"

export const RoleOnUpdateHandler = handler({
  event: "guildMemberUpdate",
  once: false,
  async handle(_, member) {
    await RoleOnJoinHandler.handle(member)
  },
})
