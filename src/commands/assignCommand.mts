import { Drizzle } from "../clients.mjs"
import { slashCommand } from "../models/slashCommand.mjs"
import { usersTable } from "../schema.mjs"
import { linkDiscord } from "../utilities/subscriptionUtilities.mjs"
import { PermissionFlagsBits } from "discord.js"
import { sql } from "drizzle-orm"

export const AssignCommand = slashCommand({
  name: "assign",
  description: "Assign a member to a Ko-fi subscription",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  dmPermission: false,
  nsfw: false,
  options: [
    {
      name: "user",
      description: "Discord user",
      type: "user",
      required: true,
    },
    {
      name: "email",
      description: "Ko-fi email address",
      type: "string",
      required: true,
      async autocomplete(_, value) {
        const matches = await Drizzle.select()
          .from(usersTable)
          .where(sql`${usersTable.email} LIKE ${`%${value}%`}`)
          .limit(25)
        return matches.map((match) => ({
          name: match.email,
          value: match.id.toString(10),
        }))
      },
    },
  ],
  async handle(interaction, user, koFi) {
    await linkDiscord(parseInt(koFi, 10), user.id)

    await interaction.reply({
      ephemeral: true,
      content: "I'm lazy so there's no fancy embed, but it should've worked",
    })
  },
})
