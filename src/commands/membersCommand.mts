import { slashCommand } from "../models/slashCommand.mjs"
import { SecretKey, Variables } from "../variables.mjs"
import {
  PermissionFlagsBits,
  ActionRowBuilder,
  type MessageActionRowComponentBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js"
import { SignJWT } from "jose"

export const MembersCommand = slashCommand({
  name: "members",
  description: "List all Discord members by tier",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  dmPermission: false,
  async handle(interaction) {
    const token = await new SignJWT({ sub: interaction.client.user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(SecretKey)

    const url = new URL("/members", Variables.inviteUrl)
    url.searchParams.set("token", token)

    await interaction.reply({
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents(
          new ButtonBuilder()
            .setLabel("View online")
            .setStyle(ButtonStyle.Link)
            .setURL(url.toString())
        ),
      ],
      ephemeral: true,
    })
  },
})
