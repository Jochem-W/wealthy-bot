import { handler } from "../models/handler.mjs"
import { Invites } from "./invitesOnStart.mjs"

export const InviteDelete = handler({
  event: "inviteDelete",
  once: false,
  handle(invite) {
    Invites.delete(invite.code)
  },
})
