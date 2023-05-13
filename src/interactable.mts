import type { ButtonHandler } from "./utilities/button.mjs"
import type { ModalHandler } from "./utilities/modal.mjs"
import type { UserSelectMenuHandler } from "./utilities/userSelectMenu.mjs"

export const RegisteredButtons = new Map<string, ButtonHandler>()
export const RegisteredModals = new Map<string, ModalHandler>()
export const RegisteredUserSelectMenus = new Map<
  string,
  UserSelectMenuHandler
>()
