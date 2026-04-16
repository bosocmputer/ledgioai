import {
  pgTable, pgEnum, uuid, varchar, text,
  integer, timestamp, index,
} from "drizzle-orm/pg-core"
import { meetings } from "./meetings"

export const messagePhase = pgEnum("message_phase", [
  "clarification",
  "analysis",
  "finding",
  "discussion",
  "synthesis",
  "quick_answer",
  "web_source",
  "system",
])

export const meetingMessages = pgTable("meeting_messages", {
  id:          uuid("id").defaultRandom().primaryKey(),
  meetingId:   uuid("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id").notNull(),

  agentId:     uuid("agent_id").notNull(),
  agentName:   varchar("agent_name", { length: 255 }).notNull(),
  agentEmoji:  varchar("agent_emoji", { length: 10 }).notNull(),
  phase:       messagePhase("phase").notNull(),
  content:     text("content").notNull(),
  tokensUsed:  integer("tokens_used").default(0).notNull(),
  sources:     text("sources"),

  timestamp:   timestamp("timestamp").defaultNow().notNull(),
}, (t) => [
  index("messages_meeting_idx").on(t.meetingId),
  index("messages_workspace_idx").on(t.workspaceId),
])
