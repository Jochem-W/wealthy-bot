import { ImageAnnotator, Prisma } from "../clients.mjs"
import { DownloadError, FileSizeError, MIMETypeError } from "../errors.mjs"
import {
  groupedSubcommand,
  slashCommand,
  slashOption,
  subcommand,
  subcommandGroup,
} from "../models/slashCommand.mjs"
import type { Ping } from "@prisma/client"
import {
  EmbedBuilder,
  SlashCommandAttachmentOption,
  SlashCommandIntegerOption,
  SlashCommandStringOption,
  bold,
  type Snowflake,
} from "discord.js"
import MIMEType from "whatwg-mimetype"
import { z } from "zod"

const maxFileSize = 10 * 1000 * 1000

const model = z.object({
  discordId: z.string(),
  texas: z.coerce.number().int(),
  virginia: z.coerce.number().int(),
  california: z.coerce.number().int(),
  florida: z.coerce.number().int(),
  germany: z.coerce.number().int(),
  singapore: z.coerce.number().int(),
})

function playable(actual: number, target: number) {
  if (actual <= target) {
    return 1
  }

  return 0
}

async function extract(id: Snowflake, text: string) {
  const data = {
    discordId: id,
    texas: text.match(/texas.+?(?<ping>\d+)ms/iu)?.[1],
    virginia: text.match(/virginia.+?(?<ping>\d+)ms/iu)?.[1],
    california: text.match(/california.+?(?<ping>\d+)ms/iu)?.[1],
    florida: text.match(/florida.+?(?<ping>\d+)ms/iu)?.[1],
    germany: text.match(/germany.+?(?<ping>\d+)ms/iu)?.[1],
    singapore: text.match(/singapore.+?(?<ping>\d+)ms/iu)?.[1],
  }

  return await model.safeParseAsync(data)
}

type Nullable<T> = { [K in keyof T]: T[K] | null }
type Input = Omit<Ping, "discordId">
type Value<T extends Input | Nullable<Input>> = T extends Input
  ? number
  : number | null

function format<T extends Input | Nullable<Input>>(
  formatter: (ping: Value<T>) => string,
  data: T
) {
  return `- ${bold("Dallas, Texas")}: ${formatter(
    data.texas as Value<T>
  )}\n- ${bold("Ashburn, Virginia")}: ${formatter(
    data.virginia as Value<T>
  )}\n- ${bold("Los Angeles, California")}: ${formatter(
    data.california as Value<T>
  )}\n- ${bold("Miami, Florida")}: ${formatter(
    data.florida as Value<T>
  )}\n- ${bold("Falkenstein, Germany")}: ${formatter(
    data.germany as Value<T>
  )}\n- ${bold("Singapore")}: ${formatter(data.singapore as Value<T>)}`
}

export const PingCommand = slashCommand({
  name: "ping",
  description: "Commands related to calculating the best server location",
  defaultMemberPermissions: null,
  dmPermission: true,
  subcommandGroups: [
    subcommandGroup({
      name: "set",
      description: "Commands related to setting your ping",
      subcommands: [
        groupedSubcommand({
          name: "text",
          description: "Set your ping using copypasted text",
          options: [
            slashOption(
              true,
              new SlashCommandStringOption()
                .setName("text")
                .setDescription("Text copypasted from Bloom.host")
            ),
          ],
          async handle(interaction, text) {
            const result = await extract(interaction.user.id, text)
            if (!result.success) {
              await interaction.reply({
                ephemeral: true,
                embeds: [
                  new EmbedBuilder()
                    .setTitle("Invalid data")
                    .setDescription("The text appears to be incorrect.")
                    .setColor(0xef4444),
                ],
              })
              return
            }

            const upserted = await Prisma.ping.upsert({
              where: { discordId: result.data.discordId },
              create: result.data,
              update: result.data,
            })

            await interaction.reply({
              ephemeral: true,
              embeds: [
                new EmbedBuilder()
                  .setTitle("Ping successfully set!")
                  .setDescription(format((p) => `${p} ms`, upserted))
                  .setColor(0x22c55e),
              ],
            })
          },
        }),
        groupedSubcommand({
          name: "image",
          description: "Set your ping using a screenshot",
          options: [
            slashOption(
              true,
              new SlashCommandAttachmentOption()
                .setName("image")
                .setDescription("A screenshot of Bloom.host")
            ),
          ],
          async handle(interaction, image) {
            if (!image.contentType) {
              throw new MIMETypeError()
            }

            const mime = new MIMEType(image.contentType)
            if (mime.type !== "image") {
              throw new MIMETypeError(mime)
            }

            if (image.size > maxFileSize) {
              throw new FileSizeError(image.size, maxFileSize)
            }

            await interaction.deferReply({ ephemeral: true })

            const response = await fetch(image.url)
            if (!response.ok) {
              throw new DownloadError(response.url)
            }

            const buffer = Buffer.from(await response.arrayBuffer())

            const [annotations] = await ImageAnnotator.textDetection(buffer)
            let result = await extract(
              interaction.user.id,
              annotations.fullTextAnnotation?.text ?? ""
            )
            if (!result.success) {
              result = await extract(
                interaction.user.id,
                annotations.fullTextAnnotation?.pages
                  ?.flatMap((page) => page.blocks)
                  .flatMap((block) => block?.paragraphs)
                  .map((paragraph) =>
                    paragraph?.words
                      ?.map((word) =>
                        word.symbols
                          ?.map((symbol) => symbol?.text)
                          .filter((w) => w)
                          .join("")
                      )
                      .filter((p) => p)
                      .join(" ")
                  )
                  .filter((b) => b)
                  .join("\n") ?? ""
              )
            }

            if (!result.success) {
              await interaction.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("Invalid data")
                    .setDescription("The text appears to be incorrect.")
                    .setColor(0xef4444),
                ],
              })
              return
            }

            const upserted = await Prisma.ping.upsert({
              where: { discordId: result.data.discordId },
              create: result.data,
              update: result.data,
            })

            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("Ping successfully set!")
                  .setDescription(format((p) => `${p} ms`, upserted))
                  .setColor(0x22c55e),
              ],
            })
          },
        }),
      ],
    }),
  ],
  subcommands: [
    subcommand({
      name: "aggregate",
      description: "Calculate the best server locations",
      options: [
        slashOption(
          false,
          new SlashCommandIntegerOption()
            .setName("ping")
            .setDescription("Set the highest ping that's considered playable")
            .setMinValue(25)
            .setMaxValue(300)
        ),
      ],
      async handle(interaction, ping) {
        const playablePing = ping ?? 100
        const all = await Prisma.ping.findMany()
        const { _avg } = await Prisma.ping.aggregate({
          _avg: {
            texas: true,
            virginia: true,
            california: true,
            florida: true,
            germany: true,
            singapore: true,
          },
        })

        const playableCounts = all.reduce(
          (p, c) => ({
            texas: p.texas + playable(c.texas, playablePing),
            virginia: p.virginia + playable(c.virginia, playablePing),
            california: p.california + playable(c.california, playablePing),
            florida: p.florida + playable(c.florida, playablePing),
            germany: p.germany + playable(c.germany, playablePing),
            singapore: p.singapore + playable(c.singapore, playablePing),
          }),
          {
            texas: 0,
            virginia: 0,
            california: 0,
            florida: 0,
            germany: 0,
            singapore: 0,
          }
        )

        const own = await Prisma.ping.findFirst({
          where: { discordId: interaction.user.id },
        })

        let description = `## Average\nThe average ping for each location\n${format(
          (p) => (p ? `${p.toFixed(1)} ms` : "-"),
          _avg
        )}\n## Playable percentage\nThe percentage of players that can play with less than ${playablePing} ping\n${format(
          (p) => `${((100 * p) / all.length).toFixed(1)}%`,
          playableCounts
        )}`

        if (own) {
          description += `\n## Your ping\nYour ping to each location\n${format(
            (p) => `${p} ms`,
            own
          )}`
        }

        await interaction.reply({
          ephemeral: true,
          embeds: [new EmbedBuilder().setDescription(description)],
        })
      },
    }),
  ],
})
