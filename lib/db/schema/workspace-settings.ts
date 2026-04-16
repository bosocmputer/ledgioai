import {
  pgTable, uuid, varchar, text,
  boolean, integer, timestamp,
} from "drizzle-orm/pg-core"
import { agentProvider } from "./agents"

export const workspaceSettings = pgTable("workspace_settings", {
  id:          uuid("id").defaultRandom().primaryKey(),
  workspaceId: text("workspace_id").notNull().unique(),

  // Web search
  serperApiKeyEncrypted: text("serper_api_key_encrypted"),
  serpApiKeyEncrypted:   text("serp_api_key_encrypted"),

  // Default LLM (fallback if agent doesn't set)
  defaultProvider:       agentProvider("default_provider"),
  defaultModel:          varchar("default_model", { length: 255 }),

  // Limits
  maxTokensPerMeeting:   integer("max_tokens_per_meeting").default(50000),
  maxMeetingsPerDay:     integer("max_meetings_per_day").default(100),

  // Feature flags
  enableWebSearch:       boolean("enable_web_search").default(true).notNull(),
  enableMcp:             boolean("enable_mcp").default(false).notNull(),
  mcpEndpoint:           varchar("mcp_endpoint", { length: 512 }),

  updatedAt:             timestamp("updated_at").defaultNow().notNull(),
})
