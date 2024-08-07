/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle } from "../clients.mjs"
import { InstallationContext, InteractionContext } from "../models/command.mjs"
import { slashCommand, slashSubcommand } from "../models/slashCommand.mjs"
import { birthdaysTable } from "../schema.mjs"
import { PermissionFlagsBits } from "discord.js"
import { eq } from "drizzle-orm"

const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

function getSuffix(number: number) {
  if (number == 1 || (number > 20 && number % 10 == 1)) {
    return "st"
  }

  if (number == 2 || (number > 20 && number % 10 == 2)) {
    return "nd"
  }

  if (number == 3 || (number > 20 && number % 10 == 3)) {
    return "rd"
  }

  return "th"
}

function formatDate(month: number, day: number) {
  return `${months[month]} ${day}${getSuffix(day)}`
}

const set = slashSubcommand({
  name: "set",
  description: "Set a member's birthdate",
  options: [
    {
      name: "user",
      description: "Target user",
      type: "user",
      required: true,
    },
    {
      name: "month",
      description: "Birth month",
      type: "integer",
      required: true,
      choices: months.map((name, value) => ({ name, value })),
    },
    {
      name: "day",
      description: "Birth day",
      type: "integer",
      required: true,
      minValue: 1,
      maxValue: 31,
    },
  ],
  async handle(interaction, user, month, day) {
    if (!interaction.inCachedGuild()) {
      return
    }

    if (
      (month <= 6 && month % 2 == 1 && day > 30) ||
      (month == 2 && day > 29) ||
      (month > 6 && month % 2 == 0 && day > 30)
    ) {
      await interaction.reply({
        ephemeral: true,
        content: `${formatDate(month, day)} is an invalid date.`,
      })
      return
    }

    const [updated] = await Drizzle.insert(birthdaysTable)
      .values({
        id: user.id,
        day,
        month: month + 1,
      })
      .onConflictDoUpdate({
        target: birthdaysTable.id,
        set: { day, month: month + 1 },
      })
      .returning()

    if (!updated) {
      await interaction.reply({
        ephemeral: true,
        content: `Birthdate not updated; ${user.displayName} isn't in the database`,
      })
      return
    }

    await interaction.reply({
      ephemeral: true,
      content: `Set ${user.displayName}'s birthdate to ${formatDate(month, day)}`,
    })
  },
})

const get = slashSubcommand({
  name: "get",
  description: "Get a member's birthdate",
  options: [
    {
      name: "user",
      description: "Target user",
      type: "user",
      required: true,
    },
  ],
  async handle(interaction, user) {
    if (!interaction.inCachedGuild()) {
      return
    }

    const [value] = await Drizzle.select()
      .from(birthdaysTable)
      .where(eq(birthdaysTable.id, user.id))

    await interaction.reply({
      ephemeral: true,
      content: `${user.displayName}'s birthdate is ${!value ? "not set" : formatDate(value.month - 1, value.day)}`,
    })
  },
})

const clear = slashSubcommand({
  name: "clear",
  description: "Clear a member's birthdate",
  options: [
    {
      name: "user",
      description: "Target user",
      type: "user",
      required: true,
    },
  ],
  async handle(interaction, user) {
    if (!interaction.inCachedGuild()) {
      return
    }

    await Drizzle.delete(birthdaysTable).where(eq(birthdaysTable.id, user.id))

    await interaction.reply({
      ephemeral: true,
      content: `Cleared ${user.displayName}'s birthdate`,
    })
  },
})

export const BirthdayCommand = slashCommand({
  name: "birthday",
  description: "Modify a member's stored birthdate",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  contexts: [InteractionContext.Guild],
  integrationTypes: [InstallationContext.GuildInstall],
  nsfw: false,
  subcommands: [get, set, clear],
})
