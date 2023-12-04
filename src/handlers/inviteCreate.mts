import { handler } from "../models/handler.mjs"
import { Invites } from "./invitesOnStart.mjs"

export const InviteCreate = handler({
  event: "inviteCreate",
  once: false,
  handle(invite) {
    if (invite.uses === null) {
      return
    }

    Invites.set(invite.code, invite.uses)
  },
})
