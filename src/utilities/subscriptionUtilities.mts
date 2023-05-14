import { Prisma } from "../clients.mjs"
import { newSubscriptionMessage } from "../messages/newSubscriptionMessage.mjs"
import { renewedLateMessage } from "../messages/renewedLateMessage.mjs"
import { tierChangedMessage } from "../messages/tierChangedMessage.mjs"
import { Config } from "../models/config.mjs"
import { fetchChannel, tryFetchMember } from "./discordUtilities.mjs"
import type { User } from "@prisma/client"
import camelcaseKeys from "camelcase-keys"
import { ChannelType } from "discord.js"
import { DateTime } from "luxon"
import { z } from "zod"

const textChannel = await fetchChannel(
  Config.loggingChannel,
  ChannelType.GuildText
)

export const DonationModel = z
  .object({
    amount: z.coerce.number(),
    email: z.string().email(),
    from_name: z.string(),
    is_first_subscription_payment: z.boolean(),
    is_subscription_payment: z.boolean(),
    tier_name: z.string().nullable(),
    timestamp: z.coerce.date(),
    type: z.string(),
    verification_token: z.string(),
  })
  .transform((arg) => camelcaseKeys(arg))

export async function processDonation(data: z.infer<typeof DonationModel>) {
  if (
    !data.isSubscriptionPayment ||
    !data.tierName ||
    data.type !== "Subscription"
  ) {
    return
  }

  const user = await Prisma.user.findFirst({ where: { email: data.email } })
  if (!user) {
    await newSubscription({ ...data, tierName: data.tierName })
    return
  }

  const updatedUser = await Prisma.user.update({
    where: { email: data.email },
    data: {
      name: data.fromName,
      lastPaymentAmount: data.amount,
      lastPaymentTier: data.tierName,
      lastPaymentTime: data.timestamp,
    },
  })

  if (expiredMillis(user) < 0) {
    await textChannel.send(renewedLateMessage(updatedUser))
  }

  if (user.lastPaymentTier !== updatedUser.lastPaymentTier) {
    await textChannel.send(tierChangedMessage(user, updatedUser))
  }

  await updateRoles(updatedUser)
}

async function newSubscription(
  data: z.infer<typeof DonationModel> & { tierName: string }
) {
  const user = await Prisma.user.create({
    data: {
      email: data.email,
      name: data.fromName,
      lastPaymentAmount: data.amount,
      lastPaymentTier: data.tierName,
      lastPaymentTime: data.timestamp,
    },
  })

  await textChannel.send(newSubscriptionMessage(user))
}

async function updateRoles(user: User) {
  if (!Config.assignRoles || !user.discordId) {
    return
  }

  const discordMember = await tryFetchMember(Config.guildId, user.discordId)
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

export async function linkDiscord(id: number, discordId: string) {
  await Prisma.user.deleteMany({ where: { discordId } })
  const user = await Prisma.user.update({ where: { id }, data: { discordId } })
  await updateRoles(user)
  return user
}

export function expiredMillis(user: User) {
  return DateTime.fromJSDate(user.lastPaymentTime)
    .plus({ days: 30 + Config.gracePeriod })
    .diffNow()
    .toMillis()
}
