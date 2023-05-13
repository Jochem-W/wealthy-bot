import type { CustomId } from "../models/customId.mjs"
import type {
  ApplicationCommandOptionChoiceData,
  AutocompleteInteraction,
  ContextMenuCommandBuilder,
  JSONEncodable,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  RESTPostAPIApplicationCommandsJSONBody,
  SlashCommandBuilder,
} from "discord.js"

export type Command<T> = {
  readonly builder: SlashCommandBuilder | ContextMenuCommandBuilder

  handle(interaction: T): Promise<void>

  handleMessageComponent?(
    interaction: MessageComponentInteraction,
    data: CustomId
  ): Promise<void>

  handleModalSubmit?(
    interaction: ModalSubmitInteraction,
    data: CustomId
  ): Promise<void>

  handleAutocomplete?(
    interaction: AutocompleteInteraction
  ): Promise<ApplicationCommandOptionChoiceData[]>
} & JSONEncodable<RESTPostAPIApplicationCommandsJSONBody>
