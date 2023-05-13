import { DuplicateNameError, UnregisteredNameError } from "../errors.mjs"
import { RegisteredUserSelectMenus } from "../interactable.mjs"
import { customIdToString, InteractionScope } from "../models/customId.mjs"
import { UserSelectMenuInteraction } from "discord.js"

export type UserSelectMenuHandler = (
  interaction: UserSelectMenuInteraction,
  args: string[]
) => Promise<void>
export type RegisteredUserSelectMenuHandler = {
  type: "userSelectMenu"
  name: string
}

export function registerUserSelectMenuHandler(
  name: string,
  handler: UserSelectMenuHandler
) {
  if (RegisteredUserSelectMenus.has(name)) {
    throw new DuplicateNameError("userSelectMenu", name)
  }

  RegisteredUserSelectMenus.set(name, handler)
  return { type: "userSelectMenu" as const, name }
}

export function userSelectMenu(
  handler: RegisteredUserSelectMenuHandler,
  args: string[]
) {
  if (!RegisteredUserSelectMenus.has(handler.name)) {
    throw new UnregisteredNameError("userSelectMenu", handler.name)
  }

  return customIdToString({
    name: handler.name,
    args,
    scope: InteractionScope.UserSelectMenu,
  })
}
