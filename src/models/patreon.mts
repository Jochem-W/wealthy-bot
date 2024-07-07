/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import { z } from "zod"

const partialTierSchema = z.object({ id: z.string(), type: z.literal("tier") })

const tierSchema = partialTierSchema.extend({
  attributes: z.object({
    title: z.string(),
  }),
})

const userSchema = z.object({
  type: z.literal("user"),
  attributes: z.object({
    full_name: z.string(),
    image_url: z.string().url(),
    url: z.string().url(),
    social_connections: z.object({
      discord: z
        .object({
          user_id: z.string(),
        })
        .nullable(),
    }),
  }),
})

const includedSchema = z.discriminatedUnion("type", [userSchema, tierSchema])

const memberSchema = z.object({
  attributes: z.object({
    email: z.string().email(),
    full_name: z.string(),
  }),
  id: z.string(),
  relationships: z.object({
    currently_entitled_tiers: z.object({
      data: z.array(partialTierSchema),
    }),
  }),
  type: z.literal("member"),
})

export const pledgeSchema = z.object({
  data: memberSchema,
  included: z.preprocess(
    (arg) =>
      z
        .array(z.unknown())
        .parse(arg)
        .filter((entry) => includedSchema.safeParse(entry).success),
    z.array(includedSchema),
  ),
})
