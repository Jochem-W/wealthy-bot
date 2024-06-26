/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle } from "../clients.mjs"
import { replaceTimeout } from "../handlers/checkSubscriptions.mjs"
import { newSubscriptionMessage } from "../messages/newSubscriptionMessage.mjs"
import { renewedLateMessage } from "../messages/renewedLateMessage.mjs"
import { tierChangedMessage } from "../messages/tierChangedMessage.mjs"
import { Config } from "../models/config.mjs"
import { inviteesTable, usersTable } from "../schema.mjs"
import { fetchChannel } from "./discordUtilities.mjs"
import camelcaseKeys from "camelcase-keys"
import { ChannelType, Client } from "discord.js"
import { and, eq, not } from "drizzle-orm"
import { DateTime } from "luxon"
import { z } from "zod"

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

  const [oldUser] = await Drizzle.select()
    .from(usersTable)
    .where(eq(usersTable.email, data.email))
    .leftJoin(inviteesTable, eq(inviteesTable.userId, usersTable.id))
  if (!oldUser) {
    await newSubscription(client, data as typeof data & { tierName: string })
    return
  }

  await Drizzle.update(usersTable)
    .set({
      name: data.fromName,
      lastPaymentTier: data.tierName,
      lastPaymentTimestamp: data.timestamp,
    })
    .where(eq(usersTable.email, data.email))

  const [newUser] = await Drizzle.transaction(async (transaction) => {
    await transaction
      .update(usersTable)
      .set({
        name: data.fromName,
        lastPaymentTier: data.tierName as string,
        lastPaymentTimestamp: data.timestamp,
      })
      .where(eq(usersTable.email, data.email))
    return await transaction
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, data.email))
      .leftJoin(inviteesTable, eq(inviteesTable.userId, usersTable.id))
  })

  if (!newUser) {
    throw new Error("Couldn't update user")
  }

  replaceTimeout(client, newUser.user)

  const channel = await fetchChannel(
    client,
    Config.logs.koFi,
    ChannelType.GuildText,
  )

  if (untilExpiredMillis(oldUser.user) < 0) {
    await channel.send(renewedLateMessage(newUser))
  }

  if (oldUser.user.lastPaymentTier !== newUser.user.lastPaymentTier) {
    await channel.send(tierChangedMessage(oldUser.user, newUser))
  }
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

  const channel = await fetchChannel(
    client,
    Config.logs.koFi,
    ChannelType.GuildText,
  )

  await channel.send(newSubscriptionMessage(user))
}

export async function linkDiscord(id: number, discordId: string) {
  await Drizzle.update(usersTable)
    .set({ discordId: null })
    .where(and(not(eq(usersTable.id, id)), eq(usersTable.discordId, discordId)))

  const [user] = await Drizzle.update(usersTable)
    .set({ discordId })
    .where(eq(usersTable.id, id))
    .returning()
  if (!user) {
    throw new Error("User not found")
  }

  return user
}

export function untilExpiredMillis(user: typeof usersTable.$inferSelect) {
  return DateTime.fromJSDate(user.lastPaymentTimestamp)
    .plus({ days: 30 + Config.gracePeriod })
    .diffNow()
    .toMillis()
}
