import {
  pgTable, uuid, varchar, text,
  integer, timestamp, index, unique,
} from "drizzle-orm/pg-core"

export const memoryFacts = pgTable("memory_facts", {
  id:          uuid("id").defaultRandom().primaryKey(),
  workspaceId: text("workspace_id").notNull(),

  key:         varchar("key", { length: 255 }).notNull(),
  value:       text("value").notNull(),
  category:    varchar("category", { length: 50 }),
  source:      varchar("source", { length: 255 }),
  confidence:  integer("confidence").default(100),

  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("memory_workspace_idx").on(t.workspaceId),
  unique("memory_workspace_key").on(t.workspaceId, t.key),
])
