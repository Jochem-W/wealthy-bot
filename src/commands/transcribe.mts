/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { OpenAIClient } from "../clients.mjs"
import { logError } from "../errors.mjs"
import { InteractionContext, InstallationContext } from "../models/command.mjs"
import { contextMenuCommand } from "../models/contextMenuCommand.mjs"
import {
  ApplicationCommandType,
  CommandInteraction,
  PermissionFlagsBits,
} from "discord.js"
import Ffmpeg from "fluent-ffmpeg"
import { createReadStream } from "fs"
import { writeFile } from "fs/promises"

export const TranscribeCommand = contextMenuCommand({
  name: "Transcribe",
  type: ApplicationCommandType.Message,
  contexts: [InteractionContext.Guild],
  integrationTypes: [InstallationContext.GuildInstall],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  async handle(interaction, message) {
    const attachment = message.attachments.find((a) => a.duration && a.waveform)
    if (!attachment) {
      await interaction.reply({
        content: "Message doesn't contain audio",
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const audio = await fetch(attachment.url)
    if (!audio.ok || !audio.body) {
      await interaction.editReply({ content: "Fetch failed" })
      return
    }

    const srcFile = `${attachment.id}.ogg`
    const dstFile = `${attachment.id}.m4a`

    await writeFile(srcFile, audio.body)

    Ffmpeg()
      .input(srcFile)
      .audioCodec("aac")
      .audioBitrate("128k")
      .saveToFile(dstFile)
      .on("error", (e) => void logError(interaction.client, e))
      .on(
        "end",
        () =>
          void end(interaction, dstFile).catch((e) => {
            void logError(interaction.client, e)
          }),
      )
      .run()
  },
})

async function end(interaction: CommandInteraction, filename: string) {
  const transcription = await OpenAIClient.audio.transcriptions.create({
    file: createReadStream(filename),
    model: "whisper-1",
  })

  await interaction.editReply({ content: JSON.stringify(transcription) })
}
