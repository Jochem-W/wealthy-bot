import { Drizzle } from "../clients.mjs"
import { slashCommand } from "../models/slashCommand.mjs"
import { inviteesTable, usersTable } from "../schema.mjs"
import { SecretKey, Variables } from "../variables.mjs"
import { EmbedBuilder } from "discord.js"
import { eq } from "drizzle-orm"
import { SignJWT } from "jose"

export const InviteCommand = slashCommand({
  name: "invite",
  description: "Invite a user to the server",
  defaultMemberPermissions: null,
  dmPermission: false,
  async handle(interaction) {
    const [userData] = await Drizzle.select()
      .from(usersTable)
      .where(eq(usersTable.discordId, interaction.user.id))
      .leftJoin(inviteesTable, eq(inviteesTable.userId, usersTable.id))

    if (!userData) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("You're not allowed to create an invite")
            .setDescription(
              "Currently, you're not allowed to create an invite link, since we haven't linked your Ko-fi account to your Discord account in our database. Please DM a staff member for assistance.",
            )
            .setColor(0xff0000),
        ],
        ephemeral: true,
      })
      return
    }

    if (userData.invitee) {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("You're not allowed to create an invite")
            .setDescription(
              "Currently, you're not allowed to create an invite link, because you've previously invited someone.",
            )
            .setColor(0xff0000),
        ],
        ephemeral: true,
      })
      return
    }

    const token = await new SignJWT({ sub: interaction.user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(SecretKey)

    const url = new URL(Variables.inviteUrl)
    url.searchParams.set("token", token)

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Invite link generated")
          .setDescription(
            `To invite someone to the server, please send them the following link:`,
          )
          .setFields({ name: "Invite link", value: url.toString() })
          .setFooter({
            text: "This link will be valid for 24 hours. You'll be able to create a new link if the link doesn't get used.",
          }),
      ],
      ephemeral: true,
    })
  },
})
