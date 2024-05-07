/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
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
