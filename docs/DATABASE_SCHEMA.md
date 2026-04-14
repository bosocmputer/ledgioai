# LEDGIO AI — Database Schema Design

> PostgreSQL schema สำหรับ Multi-Tenant SaaS — ทุกตาราง, relations, indexes

## 🎯 Design Principles

1. **Row-Level Multi-Tenancy** — ทุกตารางที่เกี่ยวกับ business data มี `company_id` FK
2. **Soft Delete** — ใช้ `deleted_at` timestamp แทนการลบจริง (สำหรับ audit trail)
3. **UUID Primary Keys** — ใช้ `uuid` เป็น PK ทุกตาราง (ป้องกัน ID enumeration)
4. **Timestamps** — ทุกตารางมี `created_at` + `updated_at`
5. **Encrypted Fields** — API keys เก็บ encrypted ในฐานข้อมูล (AES-256-GCM)

## 📊 Entity Relationship Diagram

```
users ──┬── user_companies ──┬── companies
        │                    │
        │                    ├── agents ──── agent_knowledge
        │                    │
        │                    ├── teams ──── team_agents (junction)
        │                    │
        │                    ├── research_sessions ──── research_messages
        │                    │
        │                    ├── memory_facts
        │                    │
        │                    ├── agent_stats
        │                    │
        │                    └── company_settings
        │
        └── accounts / sessions / verification_tokens (NextAuth)
```

---

## 📝 Table Definitions (Drizzle ORM Schema)

### 1. users

NextAuth v5 user table + custom fields.

```typescript
// db/schema/users.ts
import { pgTable, uuid, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: varchar("image", { length: 512 }),
  hashedPassword: varchar("hashed_password", { length: 255 }), // bcrypt hash
  isActive: boolean("is_active").default(true).notNull(),
  isSuperAdmin: boolean("is_super_admin").default(false).notNull(),
  lastLoginAt: timestamp("last_login_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
```

### 2. accounts (NextAuth)

```typescript
// db/schema/accounts.ts
export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  idToken: text("id_token"),
  sessionState: varchar("session_state", { length: 255 }),
});
```

### 3. sessions (NextAuth)

```typescript
// db/schema/sessions.ts
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});
```

### 4. companies

```typescript
// db/schema/companies.ts
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  businessType: varchar("business_type", { length: 255 }),
  registrationNumber: varchar("registration_number", { length: 50 }),
  accountingStandard: varchar("accounting_standard", { length: 20 }), // "PAEs" | "NPAEs"
  fiscalYear: varchar("fiscal_year", { length: 50 }), // e.g. "มกราคม - ธันวาคม"
  employeeCount: varchar("employee_count", { length: 20 }),
  notes: text("notes"),
  logoUrl: varchar("logo_url", { length: 512 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
});
```

### 5. user_companies (Junction — RBAC)

```typescript
// db/schema/user-companies.ts
export const userCompanyRole = pgEnum("user_company_role", ["owner", "admin", "member", "viewer"]);

export const userCompanies = pgTable("user_companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  role: userCompanyRole("role").default("member").notNull(),
  isDefault: boolean("is_default").default(false).notNull(), // default company for this user
  joinedAt: timestamp("joined_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  uniqueUserCompany: unique().on(table.userId, table.companyId),
}));
```

**Roles:**
- `owner` — สร้างบริษัท, ลบบริษัท, จัดการสมาชิก, ทุกอย่าง
- `admin` — จัดการ agents/teams/settings, เชิญสมาชิก
- `member` — ใช้ meeting room, ดู history
- `viewer` — ดูข้อมูลอย่างเดียว

### 6. agents

```typescript
// db/schema/agents.ts
export const agentProvider = pgEnum("agent_provider", [
  "anthropic", "openai", "gemini", "ollama", "openrouter", "custom"
]);

export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  provider: agentProvider("provider").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(), // AES-256-GCM
  baseUrl: varchar("base_url", { length: 512 }), // for custom/ollama
  model: varchar("model", { length: 255 }).notNull(),
  soul: text("soul").notNull(), // system prompt
  role: varchar("role", { length: 255 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  useWebSearch: boolean("use_web_search").default(false).notNull(),
  seniority: integer("seniority").default(50), // 1=highest (Chairman)
  mcpEndpoint: varchar("mcp_endpoint", { length: 512 }),
  mcpAccessMode: varchar("mcp_access_mode", { length: 50 }),
  trustedUrls: text("trusted_urls"), // JSON array string: ["rd.go.th", "dbd.go.th"]
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
}, (table) => ({
  companyIdx: index("agents_company_idx").on(table.companyId),
}));
```

### 7. agent_knowledge

```typescript
// db/schema/agent-knowledge.ts
export const agentKnowledge = pgTable("agent_knowledge", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  meta: varchar("meta", { length: 500 }),
  content: text("content").notNull(), // parsed text content
  tokens: integer("tokens").notNull(), // estimated token count
  uploadedAt: timestamp("uploaded_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  agentIdx: index("knowledge_agent_idx").on(table.agentId),
  companyIdx: index("knowledge_company_idx").on(table.companyId),
}));
```

### 8. teams

```typescript
// db/schema/teams.ts
export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  emoji: varchar("emoji", { length: 10 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { mode: "date" }),
}, (table) => ({
  companyIdx: index("teams_company_idx").on(table.companyId),
}));
```

### 9. team_agents (Junction)

```typescript
// db/schema/team-agents.ts
export const teamAgents = pgTable("team_agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  teamId: uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
}, (table) => ({
  uniqueTeamAgent: unique().on(table.teamId, table.agentId),
}));
```

### 10. research_sessions

```typescript
// db/schema/research-sessions.ts
export const sessionStatus = pgEnum("session_status", ["running", "completed", "error"]);

export const researchSessions = pgTable("research_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id),
  question: text("question").notNull(),
  agentIds: text("agent_ids").notNull(), // JSON array of agent UUIDs
  dataSource: varchar("data_source", { length: 50 }),
  status: sessionStatus("status").default("running").notNull(),
  mode: varchar("mode", { length: 20 }).default("full"), // "full" | "discuss" | "close" | "qa"
  startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { mode: "date" }),
  finalAnswer: text("final_answer"),
  totalTokens: integer("total_tokens").default(0).notNull(),
  metadata: text("metadata"), // JSON for extra data (clarificationAnswers, etc.)
}, (table) => ({
  companyIdx: index("sessions_company_idx").on(table.companyId),
  userIdx: index("sessions_user_idx").on(table.userId),
  statusIdx: index("sessions_status_idx").on(table.status),
}));
```

### 11. research_messages

```typescript
// db/schema/research-messages.ts
export const messageRole = pgEnum("message_role", [
  "thinking", "finding", "analysis", "synthesis", "chat",
  "clarification", "discussion", "web_source"
]);

export const researchMessages = pgTable("research_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => researchSessions.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").notNull(),
  agentName: varchar("agent_name", { length: 255 }).notNull(),
  agentEmoji: varchar("agent_emoji", { length: 10 }).notNull(),
  role: messageRole("role").notNull(),
  content: text("content").notNull(),
  tokensUsed: integer("tokens_used").default(0).notNull(),
  timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  sessionIdx: index("messages_session_idx").on(table.sessionId),
}));
```

### 12. memory_facts

```typescript
// db/schema/memory-facts.ts
export const memoryFacts = pgTable("memory_facts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  key: varchar("key", { length: 255 }).notNull(), // e.g. "vat_status", "company_type"
  value: text("value").notNull(), // e.g. "จดทะเบียน VAT"
  source: varchar("source", { length: 255 }), // session ID that extracted this
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  companyIdx: index("memory_company_idx").on(table.companyId),
  uniqueCompanyKey: unique().on(table.companyId, table.key),
}));
```

### 13. agent_stats

```typescript
// db/schema/agent-stats.ts
export const agentStats = pgTable("agent_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  sessions: integer("sessions").default(0).notNull(),
  inputTokens: integer("input_tokens").default(0).notNull(),
  outputTokens: integer("output_tokens").default(0).notNull(),
}, (table) => ({
  agentIdx: index("stats_agent_idx").on(table.agentId),
  companyIdx: index("stats_company_idx").on(table.companyId),
  dateIdx: index("stats_date_idx").on(table.date),
  uniqueAgentDate: unique().on(table.agentId, table.date),
}));
```

### 14. company_settings

```typescript
// db/schema/company-settings.ts
export const companySettings = pgTable("company_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }).unique(),
  serperApiKeyEncrypted: text("serper_api_key_encrypted"),
  serpApiKeyEncrypted: text("serp_api_key_encrypted"),
  supermemoryApiKeyEncrypted: text("supermemory_api_key_encrypted"),
  defaultProvider: agentProvider("default_provider"),
  defaultModel: varchar("default_model", { length: 255 }),
  maxTokensPerSession: integer("max_tokens_per_session").default(50000),
  maxSessionsPerDay: integer("max_sessions_per_day").default(100),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});
```

### 15. audit_logs (Phase 8)

```typescript
// db/schema/audit-logs.ts
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  companyId: uuid("company_id").references(() => companies.id),
  action: varchar("action", { length: 100 }).notNull(), // "agent.create", "session.start", etc.
  entityType: varchar("entity_type", { length: 50 }), // "agent", "team", "session"
  entityId: uuid("entity_id"),
  details: text("details"), // JSON with old/new values
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("audit_user_idx").on(table.userId),
  companyIdx: index("audit_company_idx").on(table.companyId),
  actionIdx: index("audit_action_idx").on(table.action),
  createdIdx: index("audit_created_idx").on(table.createdAt),
}));
```

---

## 🔗 Key Relations

```
users (1) ←→ (N) user_companies (N) ←→ (1) companies
companies (1) ←→ (N) agents
companies (1) ←→ (N) teams
companies (1) ←→ (N) research_sessions
companies (1) ←→ (N) memory_facts
companies (1) ←→ (1) company_settings
agents (1) ←→ (N) agent_knowledge
agents (1) ←→ (N) agent_stats
teams (N) ←→ (N) agents (via team_agents)
research_sessions (1) ←→ (N) research_messages
users (1) ←→ (N) research_sessions
```

---

## 📌 Indexes Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| agents | `company_id` | Filter agents by company |
| teams | `company_id` | Filter teams by company |
| research_sessions | `company_id`, `user_id`, `status` | List sessions, filter by status |
| research_messages | `session_id` | Get messages for a session |
| memory_facts | `company_id` + unique(company_id, key) | Lookup memory per company |
| agent_stats | `agent_id` + unique(agent_id, date) | Daily stats aggregation |
| agent_knowledge | `agent_id`, `company_id` | Knowledge lookup |
| audit_logs | `user_id`, `company_id`, `action`, `created_at` | Audit trail queries |

---

## 🔐 Encryption Strategy

All API keys stored in the database are encrypted with **AES-256-GCM**:

```typescript
// lib/encryption.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex"); // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv:tag:encrypted (all hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encryptedHex] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
```

**Key Management:**
- `ENCRYPTION_KEY` stored as env var (64 hex chars = 32 bytes)
- Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Never stored in filesystem in production

---

## 📐 Data Migration Mapping

BossBoard JSON → PostgreSQL:

| BossBoard File | Fields | Target Table | Notes |
|---------------|--------|-------------|-------|
| `agents.json` | id, name, emoji, provider, apiKeyEncrypted, baseUrl, model, soul, role, active, useWebSearch, seniority, mcpEndpoint, mcpAccessMode, knowledge, trustedUrls | `agents` + `agent_knowledge` | Split knowledge into separate table, re-encrypt API keys |
| `teams.json` | id, name, emoji, description, agentIds | `teams` + `team_agents` | Split agentIds into junction table |
| `research-history.json` | id, question, agentIds, status, messages[], finalAnswer, totalTokens | `research_sessions` + `research_messages` | Split messages into separate table |
| `settings.json` | serperApiKey, serpApiKey, companyInfo | `company_settings` + `companies` | companyInfo → companies table, keys → company_settings |
| `client-memory.json` | id, key, value, source | `memory_facts` | Add companyId |
| `agent-stats.json` | agentId, totalSessions, daily[] | `agent_stats` | Flatten daily array into rows |
