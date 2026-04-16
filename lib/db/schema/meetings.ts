import {
  pgTable, pgEnum, uuid, text,
  integer, timestamp, index, smallint,
} from "drizzle-orm/pg-core"

export const meetingMode = pgEnum("meeting_mode", [
  "quick_ask", "consult", "full_board",
])

export const meetingStatus = pgEnum("meeting_status", [
  "running", "completed", "error", "cancelled",
])

export const meetings = pgTable("meetings", {
  id:           uuid("id").defaultRandom().primaryKey(),
  workspaceId:  text("workspace_id").notNull(),
  userId:       text("user_id").notNull(),

  question:     text("question").notNull(),
  mode:         meetingMode("mode").notNull().default("full_board"),
  status:       meetingStatus("status").notNull().default("running"),

  // Participants
  agentIds:     text("agent_ids").notNull(),
  teamId:       uuid("team_id"),

  // Context
  fileContexts: text("file_contexts"),
  metadata:     text("metadata"),

  // Results
  finalAnswer:  text("final_answer"),
  totalTokens:  integer("total_tokens").default(0).notNull(),

  // New features
  rating:       smallint("rating"),                    // 1-5 stars
  shareToken:   text("share_token"),                   // public share link token
  tags:         text("tags"),                          // JSON array of tags
  language:     text("language").default("th"),         // response language

  startedAt:    timestamp("started_at").defaultNow().notNull(),
  completedAt:  timestamp("completed_at"),
}, (t) => [
  index("meetings_workspace_idx").on(t.workspaceId),
  index("meetings_user_idx").on(t.userId),
  index("meetings_status_idx").on(t.status),
  index("meetings_mode_idx").on(t.mode),
  index("meetings_share_token_idx").on(t.shareToken),
])
