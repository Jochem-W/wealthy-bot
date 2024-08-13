/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

export const birthdaysTable = pgTable("birthday", {
  id: text("id").primaryKey(),
  month: integer("month").notNull(),
  day: integer("day").notNull(),
})

export const invitesTable = pgTable("invites", {
  inviter: text("inviter").primaryKey(),
  invitee: text("invitee").notNull().unique(),
})

export const inviteLinksTable = pgTable("invite_links", {
  inviter: text("inviter").primaryKey(),
  code: text("code").notNull().unique(),
})

export const starboardTable = pgTable("starboard", {
  id: text("id").primaryKey(),
  message: text("message").notNull(),
  channel: text("channel").notNull(),
})

export const starredTable = pgTable(
  "starred",
  {
    userId: text("user_id").notNull(),
    messageId: text("message_id").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.messageId] }),
  }),
)

export const starboardConfiguration = pgTable("starboard_config", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  channel: text("channel").notNull(),
  enabled: boolean("enabled").notNull(),
  threshold: integer("threshold").notNull(),
  emoji: text("emoji").notNull(),
})

export const promptTable = pgTable("transcription_prompt", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  prompt: text("prompt").notNull(),
})
