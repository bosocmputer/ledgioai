# LEDGIO AI — API Specification

> ทุก API endpoint, request/response format, authentication

## 🔐 Authentication

ทุก API (ยกเว้น `/api/auth/*` และ `/api/health`) ต้อง authenticated:
- **Session cookie** จาก NextAuth
- ทุก endpoint ที่เกี่ยวกับ business data ต้องมี `companyId` (จาก cookie/header)

### Common Response Format

```typescript
// Success
{ data: T }

// Error
{ error: string, details?: unknown }

// List
{ data: T[], total: number, page: number, pageSize: number }
```

### Common Headers

```
Cookie: next-auth.session-token=xxx
Cookie: ledgio-active-company=<companyId>
Content-Type: application/json
```

---

## 📋 Endpoints

### Auth Endpoints

#### POST /api/auth/register
สร้างบัญชีผู้ใช้ใหม่

```typescript
// Request
{
  name: string;        // min 2, max 100
  email: string;       // valid email
  password: string;    // min 8, max 100
  companyName?: string; // optional, default: "{name}'s Company"
}

// Response 201
{
  message: "Registration successful",
  userId: "uuid",
  companyId: "uuid"
}

// Error 409
{ error: "Email already registered" }
```

#### POST/GET /api/auth/[...nextauth]
NextAuth handler — login, logout, session, csrf

---

### Company Endpoints

#### GET /api/companies
รายการบริษัททั้งหมดของ user

```typescript
// Response 200
{
  data: [
    {
      company: {
        id: "uuid",
        name: "สำนักงานบัญชี ABC",
        businessType: "สำนักงานบัญชี",
        accountingStandard: "NPAEs",
        fiscalYear: "มกราคม - ธันวาคม",
        employeeCount: "10-50",
        notes: "",
        isActive: true,
        createdAt: "2024-01-01T00:00:00Z"
      },
      role: "owner",
      isDefault: true
    }
  ]
}
```

#### POST /api/companies
สร้างบริษัทใหม่

```typescript
// Request
{
  name: string;                // required
  businessType?: string;
  registrationNumber?: string;
  accountingStandard?: string; // "PAEs" | "NPAEs"
  fiscalYear?: string;
  employeeCount?: string;
  notes?: string;
}

// Response 201
{ data: Company }
```

#### PUT /api/companies/[id]
แก้ไขข้อมูลบริษัท (requires: admin+)

```typescript
// Request — partial update
{
  name?: string;
  businessType?: string;
  // ... same fields as POST
}

// Response 200
{ data: Company }
```

#### DELETE /api/companies/[id]
ลบบริษัท (requires: owner) — soft delete

#### POST /api/companies/switch
สลับบริษัท active

```typescript
// Request
{ companyId: string }

// Response 200 + Set-Cookie
{ ok: true }
```

#### POST /api/companies/[id]/invite
เชิญสมาชิก (requires: admin+)

```typescript
// Request
{
  email: string;
  role: "admin" | "member" | "viewer";
}

// Response 200
{ ok: true }
```

#### GET /api/companies/[id]/members
รายชื่อสมาชิกในบริษัท

```typescript
// Response 200
{
  data: [
    {
      user: { id, name, email, image },
      role: "owner",
      joinedAt: "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### Agent Endpoints

#### GET /api/agents
รายชื่อ agents ทั้งหมด (scoped by company)

```typescript
// Response 200
{
  data: [
    {
      id: "uuid",
      name: "ผู้สอบบัญชี CPA",
      emoji: "👨‍⚖️",
      provider: "anthropic",
      hasApiKey: true,          // never expose actual key
      baseUrl: null,
      model: "claude-sonnet-4-20250514",
      soul: "คุณเป็น...",
      role: "ผู้สอบบัญชี",
      isActive: true,
      useWebSearch: true,
      seniority: 10,
      mcpEndpoint: "https://...",
      mcpAccessMode: "admin",
      trustedUrls: ["rd.go.th"],
      createdAt: "...",
      updatedAt: "..."
    }
  ]
}
```

#### POST /api/agents
สร้าง agent ใหม่ (requires: admin+)

```typescript
// Request
{
  name: string;
  emoji: string;
  provider: "anthropic" | "openai" | "gemini" | "ollama" | "openrouter" | "custom";
  apiKey: string;        // will be encrypted before storage
  baseUrl?: string;
  model: string;
  soul: string;          // system prompt
  role: string;
  useWebSearch?: boolean;
  seniority?: number;    // 1-99, lower = higher seniority
  mcpEndpoint?: string;
  mcpAccessMode?: string;
  trustedUrls?: string[];
}

// Response 201
{ data: AgentPublic }
```

#### PUT /api/agents/[id]
แก้ไข agent (requires: admin+)

#### DELETE /api/agents/[id]
ลบ agent — soft delete (requires: admin+)

---

### Agent Knowledge Endpoints

#### GET /api/agents/[id]/knowledge
รายการเอกสาร knowledge ของ agent

```typescript
// Response 200
{
  data: [
    {
      id: "uuid",
      filename: "revenue-code-2024.pdf",
      meta: "PDF: 45 pages",
      tokens: 12500,
      uploadedAt: "...",
      preview: "ประมวลรัษฎากร แก้ไขเพิ่มเติม..."  // first 200 chars
    }
  ]
}
```

#### POST /api/agents/[id]/knowledge/upload
Upload เอกสาร knowledge ใหม่

```typescript
// Request: multipart/form-data
// Field: file (max 10MB)
// Supported: .pdf, .xlsx, .xls, .docx, .csv, .json, .txt, .md

// Response 201
{ data: KnowledgePublic }
```

#### DELETE /api/agents/[id]/knowledge/[knowledgeId]
ลบเอกสาร knowledge

---

### Team Endpoints

#### GET /api/teams
รายชื่อ teams (scoped by company)

```typescript
// Response 200
{
  data: [
    {
      id: "uuid",
      name: "ทีมที่ปรึกษาหลัก",
      emoji: "🏛️",
      description: "ทีม AI 5 คน...",
      agents: [AgentPublic, ...], // populated
      createdAt: "...",
      updatedAt: "..."
    }
  ]
}
```

#### POST /api/teams
สร้าง team (requires: member+)

```typescript
// Request
{
  name: string;
  emoji: string;
  description?: string;
  agentIds: string[];    // agent UUIDs
}

// Response 201
{ data: Team }
```

#### PUT /api/teams/[id]
แก้ไข team

#### DELETE /api/teams/[id]
ลบ team

---

### Meeting / Research Endpoints

#### POST /api/meetings/stream
เริ่ม meeting (SSE streaming)

```typescript
// Request
{
  question: string;                    // คำถามหลัก
  agentIds: string[];                  // agent ที่เข้าร่วม
  mode: "full" | "discuss" | "close" | "qa";
  sessionId?: string;                  // สำหรับ multi-round meeting
  clarificationAnswers?: Array<{
    question: string;
    answer: string;
  }>;
  fileContexts?: Array<{              // เอกสารที่แนบ
    filename: string;
    meta: string;
    context: string;
    sheets?: string[];
  }>;
  conversationHistory?: Array<{        // ประวัติวาระก่อนหน้า
    question: string;
    answer: string;
  }>;
  historyMode?: "full" | "summary" | "last3" | "none";
  disableMcp?: boolean;
}

// Response: text/event-stream (SSE)
// Events: session, chairman, status, agent_start, message, agent_done,
//         web_source, clarification, memory_update, error, done
```

#### GET /api/meetings
รายการ research sessions (scoped by company)

```typescript
// Query params
?page=1&pageSize=20&status=completed&search=ภาษี

// Response 200
{
  data: [ResearchSession],
  total: 150,
  page: 1,
  pageSize: 20
}
```

#### GET /api/meetings/[id]
รายละเอียด session + messages

```typescript
// Response 200
{
  data: {
    ...ResearchSession,
    messages: [ResearchMessage]
  }
}
```

---

### Document Upload

#### POST /api/documents/upload
Upload เอกสารสำหรับ meeting context

```typescript
// Request: multipart/form-data
// Field: file (max 10MB)

// Response 200
{
  data: {
    filename: "งบการเงิน-2024.xlsx",
    meta: "Excel file: 3 sheets...",
    context: "--- Sheet: Balance Sheet ---\n...",
    tokens: 5000
  }
}
```

---

### Memory Endpoints

#### GET /api/memory
รายการ memory facts (scoped by company)

```typescript
// Response 200
{
  data: [
    {
      id: "uuid",
      key: "vat_status",
      value: "จดทะเบียน VAT",
      source: "session-uuid",
      createdAt: "...",
      updatedAt: "..."
    }
  ]
}
```

#### PUT /api/memory
Upsert memory fact

```typescript
// Request
{
  key: string;
  value: string;
  source?: string;
}

// Response 200
{ data: MemoryFact }
```

#### DELETE /api/memory/[id]
ลบ memory fact

---

### Statistics Endpoints

#### GET /api/stats
Agent statistics (scoped by company)

```typescript
// Query params
?period=30d  // 7d, 30d, 90d

// Response 200
{
  data: {
    summary: {
      totalSessions: 150,
      totalInputTokens: 500000,
      totalOutputTokens: 200000,
      activeAgents: 5
    },
    agents: [
      {
        agentId: "uuid",
        agentName: "ผู้สอบบัญชี CPA",
        agentEmoji: "👨‍⚖️",
        totalSessions: 50,
        totalInputTokens: 100000,
        totalOutputTokens: 40000,
        lastUsed: "2024-01-15",
        daily: [
          { date: "2024-01-15", sessions: 3, inputTokens: 5000, outputTokens: 2000 }
        ]
      }
    ]
  }
}
```

---

### Settings Endpoints

#### GET /api/settings
Company settings (requires: admin+)

```typescript
// Response 200
{
  data: {
    hasSerperKey: true,      // never expose actual key
    hasSerpApiKey: false,
    hasSupermemoryKey: false,
    defaultProvider: "anthropic",
    defaultModel: "claude-sonnet-4-20250514",
    maxTokensPerSession: 50000,
    maxSessionsPerDay: 100
  }
}
```

#### PUT /api/settings
Update settings (requires: admin+)

```typescript
// Request
{
  serperApiKey?: string;         // encrypted before storage
  serpApiKey?: string;
  supermemoryApiKey?: string;
  defaultProvider?: string;
  defaultModel?: string;
  maxTokensPerSession?: number;
  maxSessionsPerDay?: number;
}

// Response 200
{ data: Settings }
```

---

### Health Endpoint

#### GET /api/health
Health check (public, no auth)

```typescript
// Response 200
{
  status: "ok",
  version: "1.0.0",
  uptime: 86400,
  database: "connected",
  redis: "connected"
}
```

---

## 🔄 SSE Event Schema

```typescript
// SSE events for /api/meetings/stream

interface SSEEvent {
  event: string;
  data: unknown;
}

// All events
type SSEEvents = 
  | { event: "session"; data: { sessionId: string } }
  | { event: "chairman"; data: { agentId: string; name: string; emoji: string; role: string } }
  | { event: "status"; data: { message: string } }
  | { event: "agent_start"; data: { agentId: string; name: string; emoji: string; role: string; isChairman: boolean } }
  | { event: "message"; data: { id: string; agentId: string; agentName: string; agentEmoji: string; role: string; content: string; tokensUsed: number; timestamp: string } }
  | { event: "agent_done"; data: { agentId: string } }
  | { event: "web_source"; data: { agentId: string; sources: Array<{ title: string; url: string; domain: string; snippet: string }> } }
  | { event: "clarification"; data: { questions: string[] } }
  | { event: "memory_update"; data: { facts: Array<{ key: string; value: string }> } }
  | { event: "error"; data: { message: string } }
  | { event: "done"; data: { sessionId: string } };
```

## 📌 Validation with Zod

ทุก endpoint ใช้ Zod schema สำหรับ input validation:

```typescript
// lib/validations/agent.ts
import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().min(1).max(255),
  emoji: z.string().min(1).max(10),
  provider: z.enum(["anthropic", "openai", "gemini", "ollama", "openrouter", "custom"]),
  apiKey: z.string().min(1).max(500),
  baseUrl: z.string().url().max(512).optional(),
  model: z.string().min(1).max(255),
  soul: z.string().min(1).max(10000),
  role: z.string().min(1).max(255),
  useWebSearch: z.boolean().optional().default(false),
  seniority: z.number().int().min(1).max(99).optional(),
  mcpEndpoint: z.string().url().max(512).optional(),
  mcpAccessMode: z.string().max(50).optional(),
  trustedUrls: z.array(z.string().max(255)).max(20).optional(),
});
```

## 🚦 Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/auth/register | 5 | 1 hour |
| POST /api/auth/[...nextauth] (login) | 10 | 5 min |
| POST /api/meetings/stream | 10 | 1 min |
| POST /api/documents/upload | 20 | 1 min |
| All other POST/PUT/DELETE | 60 | 1 min |
| All GET | 120 | 1 min |

Rate limiting uses Redis (per user ID + per IP).
