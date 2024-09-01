import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { PermissionFlagsBits } from "discord.js"

export const RoleOnJoinHandler = handler({
  event: "guildMemberAdd",
  once: false,
  async handle(member) {
    if (member.guild.id !== Config.guild) {
      return
    }

    if (
      member.user.bot ||
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.roles.cache.hasAny(...Config.roles.subscribed)
    ) {
      if (member.roles.cache.has(Config.roles.unsubscribed)) {
        await member.roles.remove(Config.roles.unsubscribed)
      }

      return
    }

    if (!member.roles.cache.has(Config.roles.unsubscribed)) {
      await member.roles.add(Config.roles.unsubscribed)
    }
  },
})
