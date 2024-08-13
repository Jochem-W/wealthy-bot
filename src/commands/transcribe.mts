/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { Drizzle, OpenAIClient } from "../clients.mjs"
import { logError } from "../errors.mjs"
import { InteractionContext, InstallationContext } from "../models/command.mjs"
import { contextMenuCommand } from "../models/contextMenuCommand.mjs"
import { promptTable } from "../schema.mjs"
import {
  ApplicationCommandType,
  Attachment,
  blockQuote,
  PermissionFlagsBits,
} from "discord.js"
import { desc } from "drizzle-orm"
import Ffmpeg from "fluent-ffmpeg"
import { createReadStream } from "fs"
import { unlink, writeFile } from "fs/promises"
import { TranscriptionCreateParams } from "openai/resources/audio/transcriptions"

const transcriptions = new Map<string, string>()

export const TranscribeCommand = contextMenuCommand({
  name: "Transcribe voice message",
  type: ApplicationCommandType.Message,
  contexts: [InteractionContext.Guild],
  integrationTypes: [InstallationContext.GuildInstall],
  defaultMemberPermissions: PermissionFlagsBits.Administrator,
  async handle(interaction, message) {
    const attachment = message.attachments.find((a) => a.duration && a.waveform)
    if (!attachment) {
      await interaction.reply({
        content: "This isn't a voice message.",
        ephemeral: true,
      })
      return
    }

    if (transcriptions.has(attachment.id)) {
      await interaction.reply({
        content: `${interaction.targetMessage.url}\n${blockQuote(transcriptions.get(attachment.id) ?? "")}`,
        ephemeral: true,
      })
      return
    }

    await interaction.deferReply({ ephemeral: true })

    const audio = await fetch(attachment.url)
    if (!audio.ok || !audio.body) {
      await interaction.editReply({
        content: "An error ocurred while downloading the voice message.",
      })
      return
    }

    const srcFile = `${attachment.id}.ogg`
    const dstFile = `${attachment.id}.m4a`

    await writeFile(srcFile, audio.body)

    async function end() {
      await unlink(srcFile)

      const [prompt] = await Drizzle.select()
        .from(promptTable)
        .orderBy(desc(promptTable.timestamp))
        .limit(1)

      const stream = createReadStream(dstFile)
      const params: TranscriptionCreateParams = {
        file: stream,
        model: "whisper-1",
        response_format: "text",
        temperature: 0,
      }

      if (prompt) {
        params.prompt = prompt.prompt
      }

      const transcription = (await OpenAIClient.audio.transcriptions.create(
        params,
      )) as unknown as string

      stream.destroy()
      await unlink(dstFile)

      transcriptions.set((attachment as Attachment).id, transcription)

      await interaction.editReply({
        content: `${interaction.targetMessage.url}\n${blockQuote(transcription)}`,
      })
    }

    Ffmpeg()
      .on("error", (e) => void logError(interaction.client, e))
      .on(
        "end",
        () => void end().catch((e) => void logError(interaction.client, e)),
      )
      .input(srcFile)
      .audioCodec("aac")
      .audioBitrate("128k")
      .saveToFile(dstFile)
  },
})
