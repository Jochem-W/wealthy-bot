/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { z } from "zod"

export const webhook = z.object({
  data: z.object({
    attributes: z.object({
      email: z.string().email(),
      full_name: z.string(),
      is_free_trial: z.boolean(),
      last_charge_date: z.coerce.date(),
      last_charge_status: z.string(),
      patron_status: z.string(),
    }),
    id: z.string(),
    relationships: z.object({
      user: z.object({
        data: z.object({
          id: z.string(),
          type: z.literal("user"),
        }),
      }),
      currently_entitled_tiers: z.object({
        data: z.array(z.object({ id: z.string(), type: z.literal("tier") })),
      }),
    }),
    type: z.literal("member"),
  }),
  included: z.array(
    z.union([
      z.object({
        type: z.literal("user"),
        attributes: z.object({
          full_name: z.string(),
          image_url: z.string().url(),
          url: z.string().url(),
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
