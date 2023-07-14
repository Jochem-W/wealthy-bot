import { ImageAnnotator, Prisma } from "../clients.mjs"
import { DownloadError, FileSizeError, MIMETypeError } from "../errors.mjs"
import {
  groupedSubcommand,
  slashCommand,
  slashOption,
  subcommand,
  subcommandGroup,
} from "../models/slashCommand.mjs"
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

function std(xs: number[], mean?: number) {
  const actualMean =
    mean ?? xs.reduce((prev, current) => prev + current) / xs.length
  return Math.sqrt(
    xs
      .map((x) => (x - actualMean) ** 2)
      .reduce((prev, current) => prev + current) / xs.length
  )
}

function meanWithStd(xs: number[], unit: string = "", decimals: number = 1) {
  const mean = xs.reduce((prev, current) => prev + current) / xs.length
  const stdev = std(xs, mean)
  let formatted = `${mean.toFixed(decimals)}±${stdev.toFixed(decimals)}`
  if (unit) {
    formatted = `${formatted} ${unit}`
  }

  return formatted
}

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

function format<T extends string | number | null>(
  data: {
    texas: T
    virginia: T
    california: T
    florida: T
    germany: T
    singapore: T
  },
  formatter?: (ping: T) => string
) {
  const f =
    formatter ??
    ((ping) => (typeof ping === "string" ? ping : ping?.toString()))
  return `- ${bold("Dallas, Texas")}: ${f(data.texas)}\n- ${bold(
    "Ashburn, Virginia"
  )}: ${f(data.virginia)}\n- ${bold("Los Angeles, California")}: ${f(
    data.california
  )}\n- ${bold("Miami, Florida")}: ${f(data.florida)}\n- ${bold(
    "Falkenstein, Germany"
  )}: ${f(data.germany)}\n- ${bold("Singapore")}: ${f(data.singapore)}`
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
                  .setDescription(format(upserted, (p) => `${p} ms`))
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
                  .setDescription(format(upserted, (p) => `${p} ms`))
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

        const { _max } = await Prisma.ping.aggregate({
          _max: {
            texas: true,
            virginia: true,
            california: true,
            florida: true,
            germany: true,
            singapore: true,
          },
        })

        const means = {
          texas: meanWithStd(
            all.map((p) => p.texas),
            "ms"
          ),
          virginia: meanWithStd(
            all.map((p) => p.virginia),
            "ms"
          ),
          california: meanWithStd(
            all.map((p) => p.california),
            "ms"
          ),
          florida: meanWithStd(
            all.map((p) => p.florida),
            "ms"
          ),
          germany: meanWithStd(
            all.map((p) => p.germany),
            "ms"
          ),
          singapore: meanWithStd(
            all.map((p) => p.singapore),
            "ms"
          ),
        }

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

        let description = `## Average ping\nThe average ping to each location\n${format(
          means
        )}\n## Maximum ping\nThe maximum ping to each location\n${format(
          _max,
          (p) => (p ? `${p} ms` : "-")
        )}\n## Playable percentage\nThe percentage of players that can play with less than ${playablePing} ping\n${format(
          playableCounts,
          (p) => `${((100 * p) / all.length).toFixed(1)}%`
        )}`

        if (own) {
          description += `\n## Your ping\nYour ping to each location\n${format(
            own,
            (p) => `${p} ms`
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
