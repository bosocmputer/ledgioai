import {
  pgTable, pgEnum, uuid, varchar, text,
  boolean, integer, timestamp, index,
} from "drizzle-orm/pg-core"

export const agentProvider = pgEnum("agent_provider", [
  "anthropic", "openai", "gemini", "ollama", "openrouter", "custom",
])

export const agents = pgTable("agents", {
  id:              uuid("id").defaultRandom().primaryKey(),
  workspaceId:     text("workspace_id").notNull(),
  templateId:      uuid("template_id"),

  // Identity
  name:            varchar("name", { length: 255 }).notNull(),
  emoji:           varchar("emoji", { length: 10 }).notNull(),
  role:            varchar("role", { length: 255 }).notNull(),
  soul:            text("soul").notNull(),

  // LLM Config
  provider:        agentProvider("provider").notNull(),
  model:           varchar("model", { length: 255 }).notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  baseUrl:         varchar("base_url", { length: 512 }),

  // Capabilities
  seniority:       integer("seniority").default(50),
  useWebSearch:    boolean("use_web_search").default(false).notNull(),
  trustedUrls:     text("trusted_urls"),
  mcpEndpoint:     varchar("mcp_endpoint", { length: 512 }),
  mcpAccessMode:   varchar("mcp_access_mode", { length: 50 }),

  isActive:        boolean("is_active").default(true).notNull(),
  createdAt:       timestamp("created_at").defaultNow().notNull(),
  updatedAt:       timestamp("updated_at").defaultNow().notNull(),
  deletedAt:       timestamp("deleted_at"),
}, (t) => [
  index("agents_workspace_idx").on(t.workspaceId),
])
