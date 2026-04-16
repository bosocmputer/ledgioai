import {
  pgTable, uuid, varchar, text,
  boolean, integer, timestamp, index,
} from "drizzle-orm/pg-core"
import { agentProvider } from "./agents"

export const agentTemplates = pgTable("agent_templates", {
  id:                uuid("id").defaultRandom().primaryKey(),
  workspaceId:       text("workspace_id"), // null = system template

  // Identity
  name:              varchar("name", { length: 255 }).notNull(),
  emoji:             varchar("emoji", { length: 10 }).notNull(),
  role:              varchar("role", { length: 255 }).notNull(),
  soul:              text("soul").notNull(),

  // Suggested defaults
  suggestedProvider: agentProvider("suggested_provider").default("anthropic"),
  suggestedModel:    varchar("suggested_model", { length: 255 }).default("claude-sonnet-4-6"),
  seniority:         integer("seniority").default(50),
  useWebSearch:      boolean("use_web_search").default(false),
  trustedUrls:       text("trusted_urls"),

  // Categorization
  category:          varchar("category", { length: 100 }),
  tags:              text("tags"),
  description:       text("description"),
  isPublic:          boolean("is_public").default(true).notNull(),

  createdAt:         timestamp("created_at").defaultNow().notNull(),
  updatedAt:         timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("templates_workspace_idx").on(t.workspaceId),
  index("templates_category_idx").on(t.category),
])
