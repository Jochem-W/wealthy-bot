import { Prisma } from "../clients.mjs"
import {
  replaceTimeout,
  removeTimeout,
} from "../handlers/checkSubscriptions.mjs"
import { newSubscriptionMessage } from "../messages/newSubscriptionMessage.mjs"
import { renewedLateMessage } from "../messages/renewedLateMessage.mjs"
import { tierChangedMessage } from "../messages/tierChangedMessage.mjs"
import { Config } from "../models/config.mjs"
import { fetchChannel, tryFetchMember } from "./discordUtilities.mjs"
import type { User } from "@prisma/client"
import camelcaseKeys from "camelcase-keys"
import { ChannelType, Client, TextChannel } from "discord.js"
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
  data: z.infer<typeof DonationModel>
) {
  if (
    !data.isSubscriptionPayment ||
    !data.tierName ||
    data.type !== "Subscription"
  ) {
    return
  }

  const user = await Prisma.user.findFirst({ where: { email: data.email } })
  if (!user) {
    await newSubscription(client, { ...data, tierName: data.tierName })
    return
  }

  const updatedUser = await Prisma.user.update({
    where: { email: data.email },
    data: {
      name: data.fromName,
      lastPaymentTier: data.tierName,
      lastPaymentTime: data.timestamp,
    },
    include: { invitee: true },
  })

  replaceTimeout(client, updatedUser)

  const oldDate = DateTime.fromJSDate(user.lastPaymentTime)
  const newDate = DateTime.fromJSDate(updatedUser.lastPaymentTime)
  const diff = newDate.diff(oldDate)

  console.log(
    expiredMillis(user) < 0,
    oldDate.toISO(),
    newDate.toISO(),
    diff.shiftTo("day", "hour", "minutes", "seconds").toISO()
  )

  const fetched = await fetchChannel(
    client,
    Config.loggingChannel,
    ChannelType.GuildText
  )
  channel ??= fetched

  if (expiredMillis(user) < 0) {
    await channel.send(renewedLateMessage(updatedUser))
  }

  if (user.lastPaymentTier !== updatedUser.lastPaymentTier) {
    await channel.send(tierChangedMessage(user, updatedUser))
  }

  await updateRoles(client, updatedUser)
}

async function newSubscription(
  client: Client<true>,
  data: z.infer<typeof DonationModel> & { tierName: string }
) {
  const user = await Prisma.user.create({
    data: {
      email: data.email,
      name: data.fromName,
      lastPaymentTier: data.tierName,
      lastPaymentTime: data.timestamp,
    },
  })
  replaceTimeout(client, user)

  const fetched = await fetchChannel(
    client,
    Config.loggingChannel,
    ChannelType.GuildText
  )
  channel ??= fetched

  await channel.send(newSubscriptionMessage(user))
}

async function updateRoles(client: Client<true>, user: User) {
  if (!Config.assignRoles || !user.discordId) {
    return
  }

  const discordMember = await tryFetchMember(
    { client, id: Config.guildId },
    user.discordId
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
  discordId: string
) {
  const users = await Prisma.user.findMany({
    where: { id: { not: id }, discordId },
    select: { id: true },
  })
  const userIds = users.map((u) => u.id)
  await Prisma.user.deleteMany({
    where: { id: { in: userIds } },
  })

  for (const deletedId of userIds) {
    removeTimeout(deletedId)
  }

  const user = await Prisma.user.update({ where: { id }, data: { discordId } })
  replaceTimeout(client, user)
  await updateRoles(client, user)

  return user
}

export function expiredMillis(user: User) {
  return DateTime.fromJSDate(user.lastPaymentTime)
    .plus({ days: 30 + Config.gracePeriod })
    .diffNow()
    .toMillis()
}
