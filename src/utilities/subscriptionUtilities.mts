import { Drizzle } from "../clients.mjs"
import {
  replaceTimeout,
  removeTimeout,
} from "../handlers/checkSubscriptions.mjs"
import { newSubscriptionMessage } from "../messages/newSubscriptionMessage.mjs"
import { renewedLateMessage } from "../messages/renewedLateMessage.mjs"
import { tierChangedMessage } from "../messages/tierChangedMessage.mjs"
import { Config } from "../models/config.mjs"
import { inviteesTable, usersTable } from "../schema.mjs"
import { fetchChannel, tryFetchMember } from "./discordUtilities.mjs"
import camelcaseKeys from "camelcase-keys"
import { ChannelType, Client, TextChannel } from "discord.js"
import { and, eq, not } from "drizzle-orm"
import { DateTime } from "luxon"
import { z } from "zod"

let channel: TextChannel | undefined

export const DonationModel = z
  .object({
    email: z.string().email(),
    from_name: z.string(),
    is_subscription_payment: z.boolean(),
    tier_name: z.string().nullable(),
    timestamp: z.coerce.date(),
    type: z.string(),
    verification_token: z.string(),
  })
  .transform((arg) => camelcaseKeys(arg))

export async function processDonation(
  client: Client<true>,
  data: z.infer<typeof DonationModel>,
) {
  console.log(data)

  if (
    !data.isSubscriptionPayment ||
    !data.tierName ||
    data.type !== "Subscription"
  ) {
    return
  }

  // FIXME: race condition
  const [user] = await Drizzle.select()
    .from(usersTable)
    .where(eq(usersTable.email, data.email))
  if (!user) {
    await newSubscription(client, { ...data, tierName: data.tierName })
    return
  }

  const [updatedUser] = await Drizzle.update(usersTable)
    .set({
      name: data.fromName,
      lastPaymentTier: data.tierName,
      lastPaymentTimestamp: data.timestamp,
    })
    .where(eq(usersTable.email, data.email))
    .returning()
  if (!updatedUser) {
    throw new Error("User not found")
  }

  const updatedUserData: {
    user: typeof usersTable.$inferSelect
    invitee?: typeof inviteesTable.$inferSelect
  } = { user: updatedUser }

  const [invitee] = await Drizzle.select()
    .from(inviteesTable)
    .where(eq(inviteesTable.userId, updatedUser.id))
  if (invitee) {
    updatedUserData.invitee = invitee
  }

  replaceTimeout(client, updatedUser)

  const oldDate = DateTime.fromJSDate(user.lastPaymentTimestamp)
  const newDate = DateTime.fromJSDate(updatedUser.lastPaymentTimestamp)
  const diff = newDate.diff(oldDate)

  console.log(
    expiredMillis(user) < 0,
    oldDate.toISO(),
    newDate.toISO(),
    diff.shiftTo("day", "hour", "minutes", "seconds").toISO(),
  )

  const fetched = await fetchChannel(
    client,
    Config.logs.koFi,
    ChannelType.GuildText,
  )
  channel ??= fetched

  if (expiredMillis(user) < 0) {
    await channel.send(renewedLateMessage(updatedUserData))
  }

  if (user.lastPaymentTier !== updatedUser.lastPaymentTier) {
    await channel.send(tierChangedMessage(user, updatedUserData))
  }

  await updateRoles(client, updatedUser)
}

async function newSubscription(
  client: Client<true>,
  data: z.infer<typeof DonationModel> & { tierName: string },
) {
  const [user] = await Drizzle.insert(usersTable)
    .values({
      email: data.email,
      name: data.fromName,
      lastPaymentTier: data.tierName,
      lastPaymentTimestamp: data.timestamp,
    })
    .returning()
  if (!user) {
    throw new Error("User not found")
  }

  replaceTimeout(client, user)

  const fetched = await fetchChannel(
    client,
    Config.logs.koFi,
    ChannelType.GuildText,
  )
  channel ??= fetched

  await channel.send(newSubscriptionMessage(user))
}

async function updateRoles(
  client: Client<true>,
  user: typeof usersTable.$inferSelect,
) {
  if (!Config.assignRoles || !user.discordId) {
    return
  }

  const discordMember = await tryFetchMember(
    { client, id: Config.guild },
    user.discordId,
  )
  if (!discordMember) {
    return
  }

  const expired = expiredMillis(user) < 0

  const currentTier = Config.tiers.get(user.lastPaymentTier)
  for (const [, { roleId, position }] of Config.tiers) {
    if (!currentTier || expired) {
      await discordMember.roles.remove(roleId)
      continue
    }

    if (position > currentTier.position) {
      await discordMember.roles.remove(roleId)
      continue
    }

    await discordMember.roles.add(roleId)
  }
}

export async function linkDiscord(
  client: Client<true>,
  id: number,
  discordId: string,
) {
  const deletedUsers = await Drizzle.delete(usersTable)
    .where(and(not(eq(usersTable.id, id)), eq(usersTable.discordId, discordId)))
    .returning()
  for (const deletedUser of deletedUsers) {
    removeTimeout(deletedUser.id)
  }

  const [user] = await Drizzle.update(usersTable)
    .set({ discordId })
    .where(eq(usersTable.id, id))
    .returning()
  if (!user) {
    throw new Error("User not found")
  }

  replaceTimeout(client, user)
  await updateRoles(client, user)

  return user
}

export function expiredMillis(user: typeof usersTable.$inferSelect) {
  return DateTime.fromJSDate(user.lastPaymentTimestamp)
    .plus({ days: 30 + Config.gracePeriod })
    .diffNow()
    .toMillis()
}
