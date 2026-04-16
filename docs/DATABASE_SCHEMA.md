# LEDGIO AI — Database Schema

> PostgreSQL 16 + Drizzle ORM — อัพเดต April 2026
> Better Auth จัดการ auth tables เอง — เราเพิ่มเฉพาะ business tables

---

## Design Principles

1. **Row-Level Multi-Tenancy** — ทุก business table มี `workspace_id` FK
2. **Soft Delete** — ใช้ `deleted_at` ทุกตาราง (ห้าม hard delete)
3. **UUID Primary Keys** — ป้องกัน ID enumeration
4. **Encrypted Secrets** — API keys เก็บ AES-256-GCM ทุกตัว
5. **Timestamps** — `created_at` + `updated_at` ทุกตาราง

---

## Entity Relationship

```
Better Auth Tables (auto-generated):
  user ──── session ──── account
  user ──── member ──── organization (= Workspace)
                └── invitation

LEDGIO Business Tables:
  organization (workspace)
    ├── agents ──── agent_knowledge
    ├── agent_templates (built-in, workspace_id nullable)
    ├── teams ──── team_agents (junction)
    ├── meetings ──── meeting_messages
    ├── memory_facts
    ├── agent_stats
    └── workspace_settings
```

---

## Auth Tables (Better Auth — auto-generated)

Better Auth สร้าง schema เหล่านี้อัตโนมัติผ่าน CLI หรือ `generateSchema()`:

```typescript
// ไม่ต้องเขียนเอง — Better Auth จัดการให้
// รัน: npx better-auth generate --adapter drizzle

// Tables ที่ Better Auth สร้าง:
// - user          (id, name, email, emailVerified, image, createdAt, updatedAt)
// - session       (id, userId, token, expiresAt, ipAddress, userAgent)
// - account       (id, userId, providerId, accountId, ...)
// - verification  (id, identifier, value, expiresAt)
// - organization  (id, name, slug, logo, metadata, createdAt)  ← = Workspace
// - member        (id, userId, organizationId, role, createdAt)
// - invitation    (id, email, organizationId, role, status, ...)
```

**Note:** `organization` ใน Better Auth = `workspace` ในชื่อ product ของเรา

---

## Business Tables (เขียนเอง)

### 1. agents

ผู้เชี่ยวชาญ AI แต่ละคน — core entity ของ product

```typescript
// lib/db/schema/agents.ts
import {
  pgTable, pgEnum, uuid, varchar, text,
  boolean, integer, timestamp, index
} from "drizzle-orm/pg-core"

export const agentProvider = pgEnum("agent_provider", [
  "anthropic", "openai", "gemini", "ollama", "openrouter", "custom"
])

export const agents = pgTable("agents", {
  id:                uuid("id").defaultRandom().primaryKey(),
  workspaceId:       uuid("workspace_id").notNull(),   // FK → organization.id (Better Auth)
  templateId:        uuid("template_id"),              // FK → agent_templates.id (ถ้า clone จาก template)

  // Identity
  name:              varchar("name", { length: 255 }).notNull(),
  emoji:             varchar("emoji", { length: 10 }).notNull(),
  role:              varchar("role", { length: 255 }).notNull(),   // "ที่ปรึกษาภาษี"
  soul:              text("soul").notNull(),                        // System prompt

  // LLM Config
  provider:          agentProvider("provider").notNull(),
  model:             varchar("model", { length: 255 }).notNull(),
  apiKeyEncrypted:   text("api_key_encrypted").notNull(),          // AES-256-GCM
  baseUrl:           varchar("base_url", { length: 512 }),         // custom/ollama

  // Capabilities
  seniority:         integer("seniority").default(50),             // 1=Chairman (lowest=highest rank)
  useWebSearch:      boolean("use_web_search").default(false).notNull(),
  trustedUrls:       text("trusted_urls"),                         // JSON: ["rd.go.th", "dbd.go.th"]
  mcpEndpoint:       varchar("mcp_endpoint", { length: 512 }),
  mcpAccessMode:     varchar("mcp_access_mode", { length: 50 }),

  isActive:          boolean("is_active").default(true).notNull(),
  createdAt:         timestamp("created_at").defaultNow().notNull(),
  updatedAt:         timestamp("updated_at").defaultNow().notNull(),
  deletedAt:         timestamp("deleted_at"),
}, (t) => ({
  workspaceIdx: index("agents_workspace_idx").on(t.workspaceId),
}))
```

---

### 2. agent_knowledge

เอกสารที่ upload ให้ agent (PDF, Excel, Word, etc.)

```typescript
// lib/db/schema/agent-knowledge.ts
export const agentKnowledge = pgTable("agent_knowledge", {
  id:          uuid("id").defaultRandom().primaryKey(),
  agentId:     uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull(),

  filename:    varchar("filename", { length: 255 }).notNull(),
  mimeType:    varchar("mime_type", { length: 100 }),
  meta:        varchar("meta", { length: 500 }),
  content:     text("content").notNull(),   // parsed text content
  tokens:      integer("tokens").notNull(), // estimated token count

  uploadedAt:  timestamp("uploaded_at").defaultNow().notNull(),
}, (t) => ({
  agentIdx:     index("knowledge_agent_idx").on(t.agentId),
  workspaceIdx: index("knowledge_workspace_idx").on(t.workspaceId),
}))
```

---

### 3. agent_templates

Templates สำเร็จรูป — ผู้ใช้ clone ไปใช้ได้เลย
- `workspace_id = null` → built-in system template
- `workspace_id = xxx` → template ที่ workspace นั้นสร้างเอง

```typescript
// lib/db/schema/agent-templates.ts
export const agentTemplates = pgTable("agent_templates", {
  id:           uuid("id").defaultRandom().primaryKey(),
  workspaceId:  uuid("workspace_id"),   // null = system template

  // Identity (เหมือน agents)
  name:         varchar("name", { length: 255 }).notNull(),
  emoji:        varchar("emoji", { length: 10 }).notNull(),
  role:         varchar("role", { length: 255 }).notNull(),
  soul:         text("soul").notNull(),

  // Suggested defaults
  suggestedProvider: agentProvider("suggested_provider").default("anthropic"),
  suggestedModel:    varchar("suggested_model", { length: 255 }).default("claude-sonnet-4-6"),
  seniority:         integer("seniority").default(50),
  useWebSearch:      boolean("use_web_search").default(false),
  trustedUrls:       text("trusted_urls"),   // JSON array

  // Categorization
  category:     varchar("category", { length: 100 }),   // "accounting", "legal", "finance"
  tags:         text("tags"),                            // JSON: ["VAT", "ภาษีเงินได้", "NPAEs"]
  description:  text("description"),                     // แสดงใน template gallery
  isPublic:     boolean("is_public").default(true).notNull(),

  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  workspaceIdx: index("templates_workspace_idx").on(t.workspaceId),
  categoryIdx:  index("templates_category_idx").on(t.category),
}))
```

**Built-in Templates (seed data):**

| name | role | category | trustedUrls |
|------|------|----------|-------------|
| ที่ปรึกษาภาษีมูลค่าเพิ่ม | VAT Specialist | accounting | rd.go.th |
| ผู้เชี่ยวชาญภาษีเงินได้ | CIT Consultant | accounting | rd.go.th |
| ผู้สอบบัญชีรับอนุญาต | CPA / Auditor | accounting | fap.or.th |
| นักบัญชีอาวุโส | Senior Accountant | accounting | fap.or.th |
| ผู้ตรวจสอบภายใน | Internal Auditor | accounting | — |
| ที่ปรึกษากฎหมายแรงงาน | Labor Law Advisor | legal | labour.go.th |
| นักวิเคราะห์การเงิน | Financial Analyst | finance | — |
| ที่ปรึกษากลยุทธ์ธุรกิจ | Business Strategist | business | — |

---

### 4. teams

กลุ่ม agents สำหรับการประชุม

```typescript
// lib/db/schema/teams.ts
export const teams = pgTable("teams", {
  id:          uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),

  name:        varchar("name", { length: 255 }).notNull(),
  emoji:       varchar("emoji", { length: 10 }).notNull(),
  description: text("description"),

  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
  deletedAt:   timestamp("deleted_at"),
}, (t) => ({
  workspaceIdx: index("teams_workspace_idx").on(t.workspaceId),
}))
```

---

### 5. team_agents (Junction)

```typescript
// lib/db/schema/team-agents.ts
import { unique } from "drizzle-orm/pg-core"

export const teamAgents = pgTable("team_agents", {
  id:      uuid("id").defaultRandom().primaryKey(),
  teamId:  uuid("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
}, (t) => ({
  uniquePair: unique().on(t.teamId, t.agentId),
}))
```

---

### 6. meetings

Session การประชุม (Quick Ask / Consult / Full Board)

```typescript
// lib/db/schema/meetings.ts
export const meetingMode = pgEnum("meeting_mode", ["quick_ask", "consult", "full_board"])
export const meetingStatus = pgEnum("meeting_status", ["running", "completed", "error", "cancelled"])

export const meetings = pgTable("meetings", {
  id:           uuid("id").defaultRandom().primaryKey(),
  workspaceId:  uuid("workspace_id").notNull(),
  userId:       uuid("user_id").notNull(),   // FK → user.id (Better Auth)

  question:     text("question").notNull(),
  mode:         meetingMode("mode").notNull().default("full_board"),
  status:       meetingStatus("status").notNull().default("running"),

  // Participants
  agentIds:     text("agent_ids").notNull(),   // JSON: ["uuid1", "uuid2"]
  teamId:       uuid("team_id"),               // FK → teams.id (ถ้า invoke จาก team)

  // Context
  fileContexts: text("file_contexts"),         // JSON: uploaded docs for this meeting
  metadata:     text("metadata"),              // JSON: clarification answers, etc.

  // Results
  finalAnswer:  text("final_answer"),
  totalTokens:  integer("total_tokens").default(0).notNull(),

  startedAt:    timestamp("started_at").defaultNow().notNull(),
  completedAt:  timestamp("completed_at"),
}, (t) => ({
  workspaceIdx: index("meetings_workspace_idx").on(t.workspaceId),
  userIdx:      index("meetings_user_idx").on(t.userId),
  statusIdx:    index("meetings_status_idx").on(t.status),
  modeIdx:      index("meetings_mode_idx").on(t.mode),
}))
```

**Note:** เปลี่ยนชื่อจาก `research_sessions` → `meetings` ให้ตรง product terminology

---

### 7. meeting_messages

ข้อความทุกบรรทัดในการประชุม

```typescript
// lib/db/schema/meeting-messages.ts
export const messagePhase = pgEnum("message_phase", [
  "clarification",   // Phase 0: Chairman ถาม
  "analysis",        // Phase 1: วิเคราะห์
  "finding",         // Phase 2: นำเสนอ
  "discussion",      // Phase 3: ถกเถียง
  "synthesis",       // Phase 4: สรุป
  "quick_answer",    // Quick Ask mode
  "web_source",      // Web search results
  "system",          // Status messages
])

export const meetingMessages = pgTable("meeting_messages", {
  id:          uuid("id").defaultRandom().primaryKey(),
  meetingId:   uuid("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id").notNull(),

  agentId:     uuid("agent_id").notNull(),
  agentName:   varchar("agent_name", { length: 255 }).notNull(),
  agentEmoji:  varchar("agent_emoji", { length: 10 }).notNull(),
  phase:       messagePhase("phase").notNull(),
  content:     text("content").notNull(),
  tokensUsed:  integer("tokens_used").default(0).notNull(),
  sources:     text("sources"),   // JSON: web sources array

  timestamp:   timestamp("timestamp").defaultNow().notNull(),
}, (t) => ({
  meetingIdx:   index("messages_meeting_idx").on(t.meetingId),
  workspaceIdx: index("messages_workspace_idx").on(t.workspaceId),
}))
```

---

### 8. memory_facts

ข้อมูลที่ agent "จำ" เกี่ยวกับ workspace — inject ทุก meeting อัตโนมัติ

```typescript
// lib/db/schema/memory-facts.ts
export const memoryFacts = pgTable("memory_facts", {
  id:          uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull(),

  key:         varchar("key", { length: 255 }).notNull(),   // "vat_status"
  value:       text("value").notNull(),                      // "จดทะเบียน VAT หมายเลข 0105xxx"
  category:    varchar("category", { length: 50 }),          // "tax", "company", "employee"
  source:      varchar("source", { length: 255 }),           // meetingId ที่ extract มา
  confidence:  integer("confidence").default(100),           // 0-100

  createdAt:   timestamp("created_at").defaultNow().notNull(),
  updatedAt:   timestamp("updated_at").defaultNow().notNull(),
}, (t) => ({
  workspaceIdx:     index("memory_workspace_idx").on(t.workspaceId),
  uniqueWorkspaceKey: unique().on(t.workspaceId, t.key),   // upsert by key
}))
```

**ตัวอย่าง memory facts:**
```
key: "vat_status"       value: "จดทะเบียน VAT"       category: "tax"
key: "vat_number"       value: "0105xxxxxxxxx"         category: "tax"
key: "employee_count"   value: "12 คน"                category: "employee"
key: "fiscal_year"      value: "มกราคม - ธันวาคม"     category: "company"
key: "accounting_std"   value: "NPAEs"                 category: "accounting"
key: "main_business"    value: "นำเข้า-ส่งออกอาหาร"  category: "company"
```

---

### 9. agent_stats

Token usage tracking ต่อ agent ต่อวัน

```typescript
// lib/db/schema/agent-stats.ts
export const agentStats = pgTable("agent_stats", {
  id:            uuid("id").defaultRandom().primaryKey(),
  agentId:       uuid("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
  workspaceId:   uuid("workspace_id").notNull(),
  date:          varchar("date", { length: 10 }).notNull(),   // "2026-04-14"
  meetings:      integer("meetings").default(0).notNull(),
  inputTokens:   integer("input_tokens").default(0).notNull(),
  outputTokens:  integer("output_tokens").default(0).notNull(),
  cacheReadTokens: integer("cache_read_tokens").default(0).notNull(),
}, (t) => ({
  agentIdx:       index("stats_agent_idx").on(t.agentId),
  workspaceIdx:   index("stats_workspace_idx").on(t.workspaceId),
  dateIdx:        index("stats_date_idx").on(t.date),
  uniqueAgentDate: unique().on(t.agentId, t.date),
}))
```

---

### 10. workspace_settings

Config ต่อ workspace: API keys สำหรับ web search, default LLM, etc.

```typescript
// lib/db/schema/workspace-settings.ts
export const workspaceSettings = pgTable("workspace_settings", {
  id:          uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().unique(),

  // Web search
  serperApiKeyEncrypted:   text("serper_api_key_encrypted"),
  serpApiKeyEncrypted:     text("serp_api_key_encrypted"),

  // Default LLM (fallback ถ้า agent ไม่ได้ set)
  defaultProvider:         agentProvider("default_provider"),
  defaultModel:            varchar("default_model", { length: 255 }),

  // Limits
  maxTokensPerMeeting:     integer("max_tokens_per_meeting").default(50000),
  maxMeetingsPerDay:       integer("max_meetings_per_day").default(100),

  // Feature flags
  enableWebSearch:         boolean("enable_web_search").default(true).notNull(),
  enableMcp:               boolean("enable_mcp").default(false).notNull(),
  mcpEndpoint:             varchar("mcp_endpoint", { length: 512 }),

  updatedAt:               timestamp("updated_at").defaultNow().notNull(),
})
```

---

### 11. audit_logs (Phase 8)

```typescript
// lib/db/schema/audit-logs.ts
export const auditLogs = pgTable("audit_logs", {
  id:          uuid("id").defaultRandom().primaryKey(),
  userId:      uuid("user_id"),
  workspaceId: uuid("workspace_id"),
  action:      varchar("action", { length: 100 }).notNull(),   // "agent.create", "meeting.start"
  entityType:  varchar("entity_type", { length: 50 }),
  entityId:    uuid("entity_id"),
  details:     text("details"),   // JSON: old/new values
  ipAddress:   varchar("ip_address", { length: 45 }),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  userIdx:      index("audit_user_idx").on(t.userId),
  workspaceIdx: index("audit_workspace_idx").on(t.workspaceId),
  actionIdx:    index("audit_action_idx").on(t.action),
  createdIdx:   index("audit_created_idx").on(t.createdAt),
}))
```

---

## Summary: ทุกตาราง

| # | Table | จัดการโดย | หมายเหตุ |
|---|-------|----------|---------|
| — | user | Better Auth | auth |
| — | session | Better Auth | auth |
| — | account | Better Auth | OAuth |
| — | verification | Better Auth | email verify |
| — | organization | Better Auth | = Workspace |
| — | member | Better Auth | user-workspace RBAC |
| — | invitation | Better Auth | invite by email |
| 1 | agents | เราเขียนเอง | core entity |
| 2 | agent_knowledge | เราเขียนเอง | uploaded docs |
| 3 | agent_templates | เราเขียนเอง | pre-built templates |
| 4 | teams | เราเขียนเอง | agent groups |
| 5 | team_agents | เราเขียนเอง | junction |
| 6 | meetings | เราเขียนเอง | meeting sessions |
| 7 | meeting_messages | เราเขียนเอง | chat messages |
| 8 | memory_facts | เราเขียนเอง | cross-session memory |
| 9 | agent_stats | เราเขียนเอง | token tracking |
| 10 | workspace_settings | เราเขียนเอง | config per workspace |
| 11 | audit_logs | เราเขียนเอง | Phase 8 |

**รวม**: 7 Better Auth tables + 11 business tables = **18 tables**

---

## Key Relations

```
organization (workspace)
  ├── member[] (users ที่มีสิทธิ์ใน workspace นี้)
  ├── agents[] (workspaceId)
  │     └── agent_knowledge[] (agentId)
  ├── agent_templates[] (workspaceId nullable)
  ├── teams[] (workspaceId)
  │     └── team_agents[] → agents
  ├── meetings[] (workspaceId)
  │     └── meeting_messages[] (meetingId)
  ├── memory_facts[] (workspaceId, unique key)
  ├── agent_stats[] (workspaceId)
  └── workspace_settings (workspaceId unique)
```

---

## Encryption

```typescript
// lib/encryption.ts
import crypto from "crypto"

const ALGORITHM = "aes-256-gcm"
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex")  // 32 bytes

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decrypt(ciphertext: string): string {
  const [ivHex, tagHex, encHex] = ciphertext.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const enc = Buffer.from(encHex, "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8")
}

// Generate key: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Migration Mapping (BossBoard → PostgreSQL)

| BossBoard File | LEDGIO AI Table | หมายเหตุ |
|---------------|-----------------|---------|
| agents.json | agents | re-encrypt CBC→GCM, add workspaceId |
| agents[].knowledge | agent_knowledge | split content เป็น rows |
| teams.json | teams + team_agents | split agentIds เป็น junction rows |
| research-history.json | meetings + meeting_messages | rename fields |
| settings.json | workspace_settings + organization | companyInfo → organization |
| client-memory.json | memory_facts | add workspaceId |
| agent-stats.json | agent_stats | flatten daily array → rows |
