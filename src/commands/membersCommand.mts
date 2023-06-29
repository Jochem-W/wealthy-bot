import { GuildOnlyError } from "../errors.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { SecretKey, Variables } from "../variables.mjs"
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ActionRowBuilder,
  type MessageActionRowComponentBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js"
import { SignJWT } from "jose"

export class MembersCommand extends ChatInputCommand {
  public constructor() {
    super(
      "members",
      "Commands related to Ko-fi members",
      PermissionFlagsBits.Administrator
    )
    this.builder.addSubcommand((subcommandGroup) =>
      subcommandGroup.setName("list").setDescription("List all members by tier")
    )
  }

  private async list(
    interaction: ChatInputCommandInteraction<"raw" | "cached">
  ) {
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
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    if (!interaction.inGuild()) {
      throw new GuildOnlyError()
    }

    switch (interaction.options.getSubcommand()) {
      case "list": {
        await this.list(interaction)
        break
      }
      default:
        break
    }
  }
}
