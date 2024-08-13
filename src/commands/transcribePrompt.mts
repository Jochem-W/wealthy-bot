import { Drizzle } from "../clients.mjs"
import { InstallationContext, InteractionContext } from "../models/command.mjs"
import { modal, modalInput } from "../models/modal.mjs"
import { slashCommand, slashSubcommand } from "../models/slashCommand.mjs"
import { promptTable } from "../schema.mjs"
import { Transcriptions } from "./transcribe.mjs"
import {
  inlineCode,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"
import { desc } from "drizzle-orm"

export const TranscribePromptCommand = slashCommand({
  name: "transcribe",
  description: "Commands related to voice message transcription",
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  nsfw: false,
  integrationTypes: [InstallationContext.GuildInstall],
  contexts: [InteractionContext.Guild],
  subcommandGroups: [
    {
      name: "prompt",
      description: "Commands related to the transcription prompt",
      subcommands: [
        slashSubcommand({
          name: "edit",
          description: "Edit the transcription prompt",
          async handle(interaction) {
            const [prompt] = await Drizzle.select()
              .from(promptTable)
              .orderBy(desc(promptTable.timestamp))
              .limit(1)

            await interaction.showModal(
              promptModal(prompt ? { prompt: prompt.prompt } : {}),
            )
          },
        }),
      ],
    },
  ],
})

const promptModal = modal({
  id: "prompt-modal",
  title: "Edit transcription prompt",
  components: [
    modalInput(
      "prompt",
      true,
      new TextInputBuilder()
        .setLabel("Prompt")
        .setStyle(TextInputStyle.Paragraph)
        .setMaxLength(244),
    ),
  ],
  async handle(interaction, { prompt }) {
    await Drizzle.insert(promptTable).values({ prompt })
    Transcriptions.clear()
    await interaction.reply({
      content: `Set prompt to ${inlineCode(prompt)}.`,
      ephemeral: true,
    })
  },
})
