import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { GuildMemberFlags, PermissionFlagsBits } from "discord.js"

export const RoleOnJoin = handler({
  event: "guildMemberAdd",
  once: false,
  async handle(member) {
    if (member.guild.id !== Config.guild) {
      return
    }

    if (
      !member.flags.has(GuildMemberFlags.CompletedOnboarding) ||
      member.pending === true ||
      member.permissions.has(PermissionFlagsBits.Administrator, true)
    ) {
      return
    }

    if (
      member.roles.cache.hasAny(
        ...[...Config.tiers.values()].map((tier) => tier.roleId),
        Config.roles.invited,
        Config.roles.exempt,
      )
    ) {
      if (member.roles.cache.has(Config.roles.unsubscribed)) {
        await member.roles.remove(Config.roles.unsubscribed)
      }

      return
    }

    if (member.roles.cache.has(Config.roles.unsubscribed)) {
      return
    }

    await member.roles.add(Config.roles.unsubscribed)
  },
})
