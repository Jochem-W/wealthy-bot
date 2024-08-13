import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { PermissionFlagsBits } from "discord.js"

export const RoleOnJoinHandler = handler({
  event: "guildMemberAdd",
  once: false,
  async handle(member) {
    if (
      member.user.bot ||
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.roles.cache.hasAny(...Config.roles.subscribed)
    ) {
      await member.roles.remove(Config.roles.unsubscribed)
    } else {
      await member.roles.add(Config.roles.unsubscribed)
    }
  },
})
