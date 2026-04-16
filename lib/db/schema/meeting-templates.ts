import {
  pgTable, uuid, text, timestamp, boolean, index,
} from "drizzle-orm/pg-core"

export const meetingTemplates = pgTable("meeting_templates", {
  id:           uuid("id").defaultRandom().primaryKey(),
  workspaceId:  text("workspace_id"),  // null = system template
  name:         text("name").notNull(),
  emoji:        text("emoji").default("📋"),
  description:  text("description"),
  question:     text("question").notNull(),
  mode:         text("mode").default("full_board"),
  suggestedAgentRoles: text("suggested_agent_roles"),  // JSON array of roles
  category:     text("category"),
  isPublic:     boolean("is_public").default(false),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("meeting_templates_workspace_idx").on(t.workspaceId),
])
