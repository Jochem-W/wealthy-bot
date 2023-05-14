import { Prisma } from "../clients.mjs"
import { logError } from "../errors.mjs"
import { didntRenewMessage } from "../messages/didntRenewMessage.mjs"
import { newSubscriptionMessage } from "../messages/newSubscriptionMessage.mjs"
import { tierChangedMessage } from "../messages/tierChangedMessage.mjs"
import { Config } from "../models/config.mjs"
import { fetchChannel, tryFetchMember } from "./discordUtilities.mjs"
import type { User } from "@prisma/client"
import camelcaseKeys from "camelcase-keys"
import { ChannelType } from "discord.js"
import { Duration } from "luxon"
import { z } from "zod"

const timeouts = new Map<number, NodeJS.Timeout>()
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
    kofi_transaction_id: z.string().uuid(),
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
      expired: false,
      lastPaymentAmount: data.amount,
      lastPaymentId: data.kofiTransactionId,
      lastPaymentTier: data.tierName,
      lastPaymentTime: data.timestamp,
    },
  })

  if (user.lastPaymentTier !== updatedUser.lastPaymentTier) {
    await textChannel.send(tierChangedMessage(user, updatedUser))
  }

  await updateRoles(updatedUser)

  replaceTimeout(updatedUser.id)
}

async function newSubscription(
  data: z.infer<typeof DonationModel> & { tierName: string }
) {
  const user = await Prisma.user.create({
    data: {
      email: data.email,
      name: data.fromName,
      expired: false,
      lastPaymentAmount: data.amount,
      lastPaymentId: data.kofiTransactionId,
      lastPaymentTier: data.tierName,
      lastPaymentTime: data.timestamp,
    },
  })

  await textChannel.send(newSubscriptionMessage(user))

  replaceTimeout(user.id)
}

async function updateRoles(user: User) {
  if (!user.discordId) {
    return
  }

  const discordMember = await tryFetchMember(Config.guildId, user.discordId)
  if (!discordMember) {
    return
  }

  const currentTier = Config.tiers.get(user.lastPaymentTier)
  for (const [, { roleId, position }] of Config.tiers) {
    if (!currentTier || user.expired) {
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
  const oldUsers = await Prisma.user.findMany({ where: { discordId } })
  for (const user of oldUsers) {
    cancelTimeout(user.id)
  }

  await Prisma.user.deleteMany({ where: { discordId } })
  const user = await Prisma.user.update({ where: { id }, data: { discordId } })
  await updateRoles(user)
  return user
}

function replaceTimeout(id: number) {
  cancelTimeout(id)
  timeouts.set(
    id,
    setTimeout(
      () => void checkCallback(id),
      Duration.fromObject({ minutes: 1 }).toMillis()
    )
  )
}

function cancelTimeout(id: number) {
  clearTimeout(timeouts.get(id))
  timeouts.delete(id)
}

async function checkCallback(id: number) {
  try {
    await Prisma.user.update({ where: { id }, data: { expired: true } })
    await textChannel.send(await didntRenewMessage(id))
  } catch (e) {
    if (e instanceof Error) {
      await logError(e)
    }
  }
}
