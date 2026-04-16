import {
  pgTable, uuid, varchar, text,
  integer, index, unique,
} from "drizzle-orm/pg-core"
import { agents } from "./agents"

export const agentStats = pgTable("agent_stats", {
  id:              uuid("id").defaultRandom().primaryKey(),
  agentId:         uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  workspaceId:     text("workspace_id").notNull(),
  date:            varchar("date", { length: 10 }).notNull(),
  meetings:        integer("meetings").default(0).notNull(),
  inputTokens:     integer("input_tokens").default(0).notNull(),
  outputTokens:    integer("output_tokens").default(0).notNull(),
  cacheReadTokens: integer("cache_read_tokens").default(0).notNull(),
}, (t) => [
  index("stats_agent_idx").on(t.agentId),
  index("stats_workspace_idx").on(t.workspaceId),
  index("stats_date_idx").on(t.date),
  unique("stats_agent_date").on(t.agentId, t.date),
])
