import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { RoleOnJoin } from "./roleOnJoin.mjs"

export const RoleOnMemberUpdate = handler({
  event: "guildMemberUpdate",
  once: false,
  async handle(_, member) {
    if (member.guild.id !== Config.guild) {
      return
    }

    await RoleOnJoin.handle(member)
  },
})
