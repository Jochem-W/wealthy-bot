import { Drizzle } from "../clients.mjs"
import { slashCommand, slashSubcommand } from "../models/slashCommand.mjs"
import { usersTable } from "../schema.mjs"
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

const birthdayCommand = slashSubcommand({
  name: "birthday",
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
      (month <= 7 && month % 2 == 0 && day > 30) ||
      (month == 2 && day > 29) ||
      (month > 7 && month % 2 == 1 && day > 30)
    ) {
      await interaction.reply({
        ephemeral: true,
        content: `${formatDate(month, day)} is an invalid date.`,
      })
      return
    }

    const [updated] = await Drizzle.update(usersTable)
      .set({
        birthDay: day,
        birthMonth: month + 1,
      })
      .where(eq(usersTable.discordId, user.id))
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

export const SetCommand = slashCommand({
  name: "set",
  description: "Set various things",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  dmPermission: false,
  subcommands: [birthdayCommand],
})
