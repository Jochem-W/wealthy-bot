import { AssignCommand } from "./commands/assignCommand.mjs"
import { ColourCommand } from "./commands/colourCommand.mjs"
import { InviteCommand } from "./commands/inviteCommand.mjs"
import { MembersCommand } from "./commands/membersCommand.mjs"
import type { Command } from "./models/command.mjs"
import { Collection } from "discord.js"
import type { ApplicationCommandType, Snowflake } from "discord.js"

export const SlashCommands: Command<ApplicationCommandType.ChatInput>[] = [
  ColourCommand,
  InviteCommand,
  MembersCommand,
  AssignCommand,
]

export const MessageContextMenuCommands: Command<ApplicationCommandType.Message>[] =
  []

export const UserContextMenuCommands: Command<ApplicationCommandType.User>[] =
  []

export const RegisteredCommands = new Collection<
  Snowflake,
  Command<ApplicationCommandType>
>()
