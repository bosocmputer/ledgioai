import {
  pgTable, uuid, varchar, text,
  integer, timestamp, index,
} from "drizzle-orm/pg-core"
import { agents } from "./agents"

export const agentKnowledge = pgTable("agent_knowledge", {
  id:          uuid("id").defaultRandom().primaryKey(),
  agentId:     uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull(),

  filename:    varchar("filename", { length: 255 }).notNull(),
  mimeType:    varchar("mime_type", { length: 100 }),
  meta:        varchar("meta", { length: 500 }),
  content:     text("content").notNull(),
  tokens:      integer("tokens").notNull(),

  uploadedAt:  timestamp("uploaded_at").defaultNow().notNull(),
}, (t) => [
  index("knowledge_agent_idx").on(t.agentId),
  index("knowledge_workspace_idx").on(t.workspaceId),
])
