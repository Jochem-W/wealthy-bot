import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { Variables } from "../variables.mjs"
import { createSecretKey } from "crypto"
import type { ChatInputCommandInteraction } from "discord.js"
import { EmbedBuilder, inlineCode } from "discord.js"
import { SignJWT } from "jose"

const key = createSecretKey(Variables.secretKey, "utf-8")

export class InviteCommand extends ChatInputCommand {
  public constructor() {
    super("invite", "Invite a user to the server", null)
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    const token = await new SignJWT({ sub: interaction.user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("12h")
      .sign(key)

    const url = new URL(Variables.inviteUrl)
    url.searchParams.set("token", token)

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Invite link generated")
          .setDescription(
            `To invite someone to the server, please send them the following link:`
          )
          .setFields(
            { name: "\u200b", value: inlineCode(url.toString()) },
            {
              name: "\u200b",
              value:
                "This link will be valid for 12 hours, and every time the link is used, the previous invitee will be kicked.",
            }
          ),
      ],
      ephemeral: true,
    })
  }
}
