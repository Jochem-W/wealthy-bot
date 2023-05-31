import { ColourCommand } from "./commands/colourCommand.mjs"
import { ImportCommand } from "./commands/importCommand.mjs"
import { InviteCommand } from "./commands/inviteCommand.mjs"
import { MembersCommand } from "./commands/membersCommand.mjs"
import type { ChatInputCommand } from "./models/chatInputCommand.mjs"
import type { MessageContextMenuCommand } from "./models/messageContextMenuCommand.mjs"
import type { UserContextMenuCommand } from "./models/userContextMenuCommand.mjs"
import type { Command } from "./types/command.mjs"
import { Collection, CommandInteraction } from "discord.js"
import type { Snowflake } from "discord.js"

export const SlashCommands: ChatInputCommand[] = [
  new ColourCommand(),
  new MembersCommand(),
  new ImportCommand(),
  new InviteCommand(),
]

export const MessageContextMenuCommands: MessageContextMenuCommand[] = []

export const UserContextMenuCommands: UserContextMenuCommand[] = []

export const RegisteredCommands = new Collection<
  Snowflake,
  Command<CommandInteraction>
>()
