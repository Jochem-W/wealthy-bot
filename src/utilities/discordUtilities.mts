import { Discord } from "../clients.mjs"
import {
  ChannelNotFoundError,
  GuildOnlyError,
  InvalidChannelTypeError,
  OwnerOnlyError,
} from "../errors.mjs"
import type {
  Channel,
  FetchChannelOptions,
  PublicThreadChannel,
  Snowflake,
} from "discord.js"
import {
  ChannelType,
  DiscordAPIError,
  RESTJSONErrorCodes,
  Guild,
  Team,
} from "discord.js"
import type {
  FetchMemberOptions,
  Interaction,
  UserResolvable,
} from "discord.js"
import { DateTime } from "luxon"

export function snowflakeToDateTime(snowflake: Snowflake) {
  return DateTime.fromMillis(
    Number((BigInt(snowflake) >> 22n) + 1420070400000n),
    { zone: "utc" }
  )
}

export async function tryFetchMember(
  guild: Snowflake | Guild,
  options: FetchMemberOptions | UserResolvable
) {
  if (!(guild instanceof Guild)) {
    guild = await Discord.guilds.fetch(guild)
  }

  try {
    return await guild.members.fetch(options)
  } catch (e) {
    if (
      e instanceof DiscordAPIError &&
      e.code === RESTJSONErrorCodes.UnknownMember
    ) {
      return null
    }

    throw e
  }
}

export async function fetchChannel<T extends ChannelType>(
  id: Snowflake,
  type: T,
  options?: FetchChannelOptions
) {
  const channel = await Discord.channels.fetch(id, {
    allowUnknownGuild: true,
    ...options,
  })
  if (!channel) {
    throw new ChannelNotFoundError(id)
  }

  if (channel.type !== type) {
    throw new InvalidChannelTypeError(channel, type)
  }

  return channel as T extends
    | ChannelType.PublicThread
    | ChannelType.AnnouncementThread
    ? PublicThreadChannel
    : Extract<Channel, { type: T }>
}

export async function fetchInteractionGuild(interaction: Interaction) {
  if (!interaction.inGuild()) {
    throw new GuildOnlyError()
  }

  return interaction.guild ?? (await Discord.guilds.fetch(interaction.guildId))
}

export async function ensureOwner(interaction: Interaction) {
  let application = interaction.client.application
  if (!application.owner) {
    application = await application.fetch()
  }

  if (!application.owner) {
    throw new OwnerOnlyError()
  }

  if (application.owner instanceof Team) {
    if (!application.owner.members.has(interaction.user.id)) {
      throw new OwnerOnlyError()
    }

    return
  }

  if (application.owner.id !== interaction.user.id) {
    throw new OwnerOnlyError()
  }
}