/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { z } from "zod"

export const webhook = z.object({
  data: z.object({
    attributes: z.object({
      access_expires_at: z.any(),
      full_name: z.string(),
      is_free_member: z.any(),
      is_free_trial: z.any(),
      last_charge_date: z.coerce.date(),
      last_charge_status: z.string(),
      patron_status: z.string(),
    }),
    id: z.any(),
    relationships: z.object({
      user: z.object({
        data: z.object({
          id: z.string(),
          type: z.string(),
        }),
      }),
    }),
    type: z.string(),
  }),
  included: z.array(
    z.union([
      z.object({
        type: z.literal("user"),
        attributes: z.object({
          discord_id: z.string(),
          email: z.string(),
          full_name: z.string(),
          image_url: z.string().url(),
          social_connections: z.object({
            discord: z.object({
              user_id: z.string(),
            }),
          }),
        }),
      }),
      z.object({ type: z.string() }),
    ]),
  ),
})
