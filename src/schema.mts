import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core"

export const usersTable = pgTable("user", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  lastPaymentTier: text("lastPaymentTier").notNull(),
  lastPaymentTimestamp: timestamp("lastPaymentTimestamp").notNull(),
  discordId: text("discordId").unique(),
})

export const inviteesTable = pgTable("invitee", {
  discordId: text("discordId").primaryKey(),
  userId: integer("userId")
    .notNull()
    .references(() => usersTable.id),
})
