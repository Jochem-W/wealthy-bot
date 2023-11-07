import { handler } from "../models/handler.mjs"
import { RoleOnJoin } from "./roleOnJoin.mjs"

export const RoleOnMemberUpdate = handler({
  event: "guildMemberUpdate",
  once: false,
  async handle(_, member) {
    await RoleOnJoin.handle(member)
  },
})
