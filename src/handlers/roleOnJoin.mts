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
    let isExempt = member.roles.cache.has(Config.roles.exempt)
    let isUnsubscribed = member.roles.cache.has(Config.roles.unsubscribed)

    if (isUnsubscribed && (isExempt || isSubscribed || isInvited)) {
      // await member.roles.remove(Config.roles.unsubscribed)
      console.log("Removing unsubscribed role from", member.user.displayName)
      isUnsubscribed = false
    }

    if (isExempt && (isSubscribed || isInvited)) {
      // await member.roles.remove(Config.roles.exempt)
      console.log("Removing exempt role from", member.user.displayName)
      isExempt = false
    }

    if (isInvited) {
      const [invitee] = await Drizzle.select()
        .from(inviteesTable)
        .where(eq(inviteesTable.discordId, member.id))
      if (!invitee) {
        // await member.roles.remove(Config.roles.invited)
        console.log("Removing invitee role from", member.user.displayName)
        isInvited = false
      }
    }

    if (!isUnsubscribed && !isInvited && !isExempt && !isSubscribed) {
      // await member.roles.add(Config.roles.unsubscribed)
      console.log("Adding unsubscribed role from", member.user.displayName)
    }
  },
})
