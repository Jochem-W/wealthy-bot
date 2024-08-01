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
import { unlink } from "fs/promises"
import { Readable } from "stream"

export const TranscribeCommand = contextMenuCommand({
  name: "Transcribe",
  type: ApplicationCommandType.Message,
  contexts: [InteractionContext.Guild],
  integrationTypes: [InstallationContext.GuildInstall],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  async handle(interaction, message) {
    const attachment = message.attachments.find((a) => a.duration && a.waveform)
    if (!attachment) {
      await interaction.reply({ embeds: [], ephemeral: true })
      return
    }

    const audio = await fetch(attachment.url)
    if (!audio.ok || !audio.body) {
      await interaction.reply({ embeds: [], ephemeral: true })
      return
    }

    const filename = `${attachment.id}.m4a`

    Ffmpeg()
      .input(Readable.fromWeb(audio.body))
      .audioCodec("aac")
      .audioBitrate("128k")
      .saveToFile(filename)
      .on("error", (e) => void logError(interaction.client, e))
      .on(
        "end",
        () =>
          void end(interaction, filename).catch((e) => {
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
    response_format: "text",
  })

  await interaction.reply({ content: transcription.text, ephemeral: true })

  await unlink(filename)
}
