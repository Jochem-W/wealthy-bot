/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle } from "../clients.mjs"
import { Config } from "../models/config.mjs"
import { handler } from "../models/handler.mjs"
import { inviteesTable } from "../schema.mjs"
import { GuildMemberFlags, PermissionFlagsBits } from "discord.js"
import { eq } from "drizzle-orm"

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
      return // TODO: remove admin check
    }

    const isSubscribed = member.roles.cache.hasAny(
      ...[...Config.tiers.values()].map((tier) => tier.roleId),
    )
    let isInvited = member.roles.cache.has(Config.roles.invited)
    let isExemptNormal = member.roles.cache.has(Config.roles.exemptNormal)
    let isExemptExtra = member.roles.cache.has(Config.roles.exemptExtra)
    let isExempt = isExemptNormal || isExemptExtra
    let isUnsubscribed = member.roles.cache.has(Config.roles.unsubscribed)

    if (isExemptNormal && isExemptExtra) {
      console.log("Removing normal exempt role from", member.user.displayName)
      await member.roles.remove(Config.roles.exemptNormal)
      isExemptNormal = false
    }

    if (isInvited) {
      const [invitee] = await Drizzle.select()
        .from(inviteesTable)
        .where(eq(inviteesTable.discordId, member.id))
      if (!invitee) {
        console.log("Removing invitee role from", member.user.displayName)
        await member.roles.remove(Config.roles.invited)
        isInvited = false
      }
    }

    if (isExemptNormal && (isSubscribed || isInvited)) {
      console.log("Removing normal exempt role from", member.user.displayName)
      await member.roles.remove(Config.roles.exemptNormal)
      isExemptNormal = false
      isExempt = isExemptNormal || isExemptExtra
    }

    if (isExemptExtra && (isSubscribed || isInvited)) {
      console.log("Removing extra exempt role from", member.user.displayName)
      await member.roles.remove(Config.roles.exemptExtra)
      isExemptExtra = false
      isExempt = isExemptNormal || isExemptExtra
    }

    if (isUnsubscribed && (isExempt || isSubscribed || isInvited)) {
      console.log("Removing unsubscribed role from", member.user.displayName)
      await member.roles.remove(Config.roles.unsubscribed)
      isUnsubscribed = false
    }

    if (!isUnsubscribed && !isInvited && !isExempt && !isSubscribed) {
      console.log("Adding unsubscribed role to", member.user.displayName)
      await member.roles.add(Config.roles.unsubscribed)
      isUnsubscribed = true
    }
  },
})
