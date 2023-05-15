import { Prisma } from "../clients.mjs"
import { ChatInputCommand } from "../models/chatInputCommand.mjs"
import { ensureOwner } from "../utilities/discordUtilities.mjs"
import { parse } from "csv-parse"
import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from "discord.js"
import { DateTime } from "luxon"
import { finished } from "stream/promises"
import { z } from "zod"

const model = z
  .object({
    Name: z.string(),
    Email: z.string().email(),
    IsActive: z.coerce.boolean(),
    SinceDateUTC: z.coerce.date(),
    Tier: z.string(),
  })
  .transform((arg) => ({
    name: arg.Name,
    email: arg.Email,
    isActive: arg.IsActive,
    sinceDateUtc: arg.SinceDateUTC,
    tier: arg.Tier,
  }))

export class ImportCommand extends ChatInputCommand {
  public constructor() {
    super(
      "import",
      "Import subscriptions from a CSV file",
      PermissionFlagsBits.Administrator
    )
    this.builder.addAttachmentOption((builder) =>
      builder
        .setName("file")
        .setDescription("CSV file from Ko-fi")
        .setRequired(true)
    )
  }

  public async handle(interaction: ChatInputCommandInteraction) {
    await ensureOwner(interaction)

    await interaction.deferReply({ ephemeral: true })
    const attachment = interaction.options.getAttachment("file", true)

    const response = await fetch(attachment.url)
    const string = await response.text()

    const records: z.infer<typeof model>[] = []
    const parser = parse(string, { columns: true })
    parser.on("readable", () => {
      let record
      while ((record = parser.read() as unknown) !== null) {
        const parsed = model.safeParse(record)
        if (!parsed.success) {
          continue
        }

        records.push(parsed.data)
      }
    })
    await finished(parser)

    const users = []
    for (const member of records) {
      let dateTime = DateTime.fromJSDate(member.sinceDateUtc)
      while (dateTime.diffNow().toMillis() < 0) {
        dateTime = dateTime.plus({ days: 30 })
      }

      dateTime = dateTime.minus({ days: 30 })
      const prismaUser = await Prisma.user.create({
        data: {
          email: member.email,
          name: member.name,
          lastPaymentTier: member.tier,
          lastPaymentTime: dateTime.toJSDate(),
        },
      })
      users.push(prismaUser)
    }

    await interaction.editReply({
      files: [
        new AttachmentBuilder(
          Buffer.from(JSON.stringify(users, undefined, 4)),
          { name: "users.json" }
        ),
      ],
    })
  }
}
