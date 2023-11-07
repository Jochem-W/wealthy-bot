import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { GuildMemberFlags } from "discord.js"

export const RoleOnJoin = handler({
  event: "guildMemberAdd",
  once: false,
  async handle(member) {
    if (
      !member.flags.has(GuildMemberFlags.CompletedOnboarding) ||
      member.pending === true
    ) {
      return
    }

    if (
      member.roles.cache.hasAny(
        ...[...Config.tiers.values()].map((tier) => tier.roleId),
        ...Object.values(Config.roles),
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
