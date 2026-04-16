import {
  pgTable, uuid, text, varchar,
  timestamp, index, jsonb,
} from "drizzle-orm/pg-core"

export const auditLogs = pgTable("audit_logs", {
  id:          uuid("id").defaultRandom().primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  userId:      text("user_id").notNull(),

  action:      varchar("action", { length: 100 }).notNull(), // e.g. "agent.create", "team.delete"
  resource:    varchar("resource", { length: 50 }).notNull(), // e.g. "agent", "team", "meeting"
  resourceId:  text("resource_id"),                           // ID of the affected resource
  details:     jsonb("details"),                              // Extra context (optional)

  ipAddress:   varchar("ip_address", { length: 45 }),
  userAgent:   text("user_agent"),

  createdAt:   timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("audit_workspace_idx").on(t.workspaceId),
  index("audit_user_idx").on(t.userId),
  index("audit_action_idx").on(t.action),
  index("audit_created_idx").on(t.createdAt),
])
