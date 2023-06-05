import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { SecretKey, Variables } from "../variables.mjs"
import type { ChatInputCommandInteraction } from "discord.js"
import { EmbedBuilder } from "discord.js"
import { SignJWT } from "jose"

export class InviteCommand extends ChatInputCommand {
  public constructor() {
    super("invite", "Invite a user to the server", null)
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    const token = await new SignJWT({ sub: interaction.user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(SecretKey)

    const url = new URL(Variables.inviteUrl)
    url.searchParams.set("token", token)

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Invite link generated")
          .setDescription(
            `To invite someone to the server, please send them the following link:`
          )
          .setFields({ name: "Invite link", value: url.toString() })
          .setFooter({
            text: "This link will be valid for 12 hours. Every time the link is used, the previous invitee will be kicked.",
          }),
      ],
      ephemeral: true,
    })
  }
}
