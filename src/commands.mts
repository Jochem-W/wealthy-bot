/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { BirthdayCommand } from "./commands/birthday.mjs"
import { ColourCommand } from "./commands/colour.mjs"
import { MembersCommand } from "./commands/members.mjs"
import { StarboardCommand } from "./commands/starboard.mjs"
import type { Command } from "./models/command.mjs"
import { Collection } from "discord.js"
import type { ApplicationCommandType, Snowflake } from "discord.js"

export const SlashCommands: Command<ApplicationCommandType.ChatInput>[] = [
  ColourCommand,
  MembersCommand,
  BirthdayCommand,
  StarboardCommand,
]

export const MessageContextMenuCommands: Command<ApplicationCommandType.Message>[] =
  []

export const UserContextMenuCommands: Command<ApplicationCommandType.User>[] =
  []

export const RegisteredCommands = new Collection<
  Snowflake,
  Command<ApplicationCommandType>
>()
