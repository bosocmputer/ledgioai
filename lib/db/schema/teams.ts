import {
  pgTable, uuid, varchar, text,
  timestamp, index,
} from "drizzle-orm/pg-core"

export const teams = pgTable("teams", {
  id:          uuid("id").defaultRandom().primaryKey(),
  workspaceId: text("workspace_id").notNull(),

  name:        varchar("name", { length: 255 }).notNull(),
  emoji:       varchar("emoji", { length: 10 }).notNull(),
  description: text("description"),

  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
  deletedAt:   timestamp("deleted_at"),
}, (t) => [
  index("teams_workspace_idx").on(t.workspaceId),
])
