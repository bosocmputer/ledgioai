import {
  pgTable, uuid, text, timestamp, index, boolean,
} from "drizzle-orm/pg-core"

export const scheduledMeetings = pgTable("scheduled_meetings", {
  id:           uuid("id").defaultRandom().primaryKey(),
  workspaceId:  text("workspace_id").notNull(),
  userId:       text("user_id").notNull(),

  question:     text("question").notNull(),
  mode:         text("mode").notNull().default("full_board"),
  agentIds:     text("agent_ids").notNull(),
  teamId:       uuid("team_id"),

  scheduledAt:  timestamp("scheduled_at").notNull(),
  cronExpr:     text("cron_expr"),              // null = one-time, or cron for recurring
  isActive:     boolean("is_active").default(true),
  lastRunAt:    timestamp("last_run_at"),
  meetingId:    uuid("meeting_id"),             // last meeting created from this schedule

  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("scheduled_meetings_workspace_idx").on(t.workspaceId),
  index("scheduled_meetings_scheduled_at_idx").on(t.scheduledAt),
])
