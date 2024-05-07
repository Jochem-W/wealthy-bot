/**
 * Licensed under AGPL 3.0 or newer. Copyright (C) 2024 Jochem W. <license (at) jochem (dot) cc>
 */
import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

export const usersTable = pgTable("user", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  lastPaymentTier: text("lastPaymentTier").notNull(),
  lastPaymentTimestamp: timestamp("lastPaymentTimestamp").notNull(),
  discordId: text("discordId").unique(),
})

export const birthdaysTable = pgTable("birthday", {
  id: text("id").primaryKey(),
  month: integer("month").notNull(),
  day: integer("day").notNull(),
})

export const inviteesTable = pgTable("invitee", {
  discordId: text("discordId").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => usersTable.id),
})

export const inviteLinksTable = pgTable("inviteLinks", {
  discordId: text("discordId").primaryKey(),
  code: text("code").notNull().unique(),
})

export const starboardTable = pgTable("starboard", {
  id: text("id").primaryKey(),
  message: text("message").notNull(),
  channel: text("channel").notNull(),
})

export const starboardConfiguration = pgTable("starboard_config", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  channel: text("channel").notNull(),
  enabled: boolean("enabled").notNull(),
  threshold: integer("threshold").notNull(),
  emoji: text("emoji").notNull(),
})
