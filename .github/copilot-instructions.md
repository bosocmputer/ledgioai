# LEDGIO AI — Copilot Instructions

> Quick reference สำหรับ AI coding assistant. อ่านไฟล์นี้ก่อนทุกครั้ง แล้วอ่าน docs/ ตามลำดับ

---

## What Is This?

**LEDGIO AI** = แพลตฟอร์มสร้าง AI Expert Team — ผู้ใช้สร้าง "ผู้เชี่ยวชาญ AI" หลายด้าน แล้วให้พวกเขา **ประชุม ถกเถียง หาคำตอบร่วมกัน** เหมือนจ้างทีมที่ปรึกษาจริงๆ แต่ราคาถูกกว่ามาก

**Core Product Loop:**
```
สร้าง Agent (ผู้เชี่ยวชาญ) → จัดทีม → ถามคำถาม → ดูการถกเถียง → ได้คำตอบ
```

**3 Meeting Modes:**
- ⚡ **Quick Ask** — 1 agent ตอบทันที (< 10 วิ)
- 🤝 **Consult** — 2-3 agents ถกเถียงกัน (30-60 วิ)
- 🏛️ **Full Board** — ทีมเต็ม 5-phase meeting (2-5 นาที)

**Target Users:** สำนักงานบัญชีไทย, SME, CFO, Freelance นักบัญชี

---

## Read Order (docs/)

1. `docs/MASTER_PLAN.md` — Vision, phases, tech stack decisions
2. `docs/DATABASE_SCHEMA.md` — Schema ทุกตาราง (Drizzle)
3. `docs/AUTH_SYSTEM.md` — Better Auth + RBAC
4. `docs/MULTI_TENANT.md` — Workspace isolation
5. `docs/AI_INTEGRATION.md` — Mastra engine, 3 modes, prompts
6. `docs/PROJECT_STRUCTURE.md` — File structure, conventions
7. `docs/API_SPEC.md` — Endpoint spec ทุกตัว
8. `docs/INFRASTRUCTURE.md` — Docker, deploy, monitoring
9. `docs/MIGRATION.md` — BossBoard → PostgreSQL (ทำสุดท้าย)

---

## Tech Stack (ที่ตัดสินใจแล้ว — ห้ามเปลี่ยน)

| Layer | Choice | หมายเหตุ |
|-------|--------|---------|
| Framework | Next.js 15 App Router | SSR + API routes |
| Auth | **Better Auth** | organizations + RBAC plugins built-in |
| AI Engine | **Mastra AI** | AgentNetwork + Memory + MCP |
| Database | PostgreSQL + Drizzle ORM | Type-safe queries |
| Cache | Redis (ioredis) | Rate limit + session |
| Validation | Zod | ทุก API input |
| Styling | Tailwind CSS 4 | |
| Logging | Pino | Structured |
| Encryption | AES-256-GCM (Node crypto) | API keys in DB |
| Deploy | Docker + GitHub Actions | On-premise port 3004 |

---

## Key Terminology (ใช้ให้สม่ำเสมอในทุก file)

| Term | ความหมาย | ห้ามใช้คำว่า |
|------|----------|------------|
| **Workspace** | พื้นที่ทำงาน (multi-tenant unit) | ~~Company~~ |
| **Agent** | ผู้เชี่ยวชาญ AI คนหนึ่ง | ~~Bot, Assistant~~ |
| **Team** | กลุ่ม agents | ~~Group~~ |
| **Meeting** | session การประชุม | ~~Research, Session~~ (ใน UI) |
| **Memory** | ข้อมูลที่จำข้ามเซสชัน | ~~Cache~~ |
| **Soul** | System prompt ของ agent | ~~Persona, Prompt~~ |

---

## Critical Rules

### Multi-Tenant Safety
```typescript
// ✅ ถูก — ทุก business query ต้อง filter workspaceId
const agents = await db.query.agents.findMany({
  where: and(eq(agents.workspaceId, workspaceId), isNull(agents.deletedAt))
})

// ❌ ผิด — ไม่มี workspaceId filter = data leak ข้าม tenant
const agents = await db.query.agents.findMany()
```

### Database Access
```typescript
// ✅ ถูก — ผ่าน queries layer เสมอ
import { getAgentsByWorkspace } from "@/lib/db/queries/agents"

// ❌ ผิด — ห้าม query ตรงใน route handler
import { db } from "@/lib/db"
```

### API Key Encryption
```typescript
// ✅ ถูก — encrypt ก่อน store ทุกครั้ง
const encrypted = encrypt(apiKey)
await db.insert(agents).values({ ...data, apiKeyEncrypted: encrypted })

// ❌ ผิด — ห้าม store plaintext key
await db.insert(agents).values({ ...data, apiKey: apiKey })
```

### Soft Delete
```typescript
// ✅ ถูก
await db.update(agents).set({ deletedAt: new Date() }).where(eq(agents.id, id))

// ❌ ผิด — ห้าม hard delete
await db.delete(agents).where(eq(agents.id, id))
```

### React Components
```typescript
// ✅ Server Component by default
export default async function AgentsPage() { ... }

// "use client" เฉพาะเมื่อ: useState, useEffect, event handlers, browser APIs
"use client"
export function AgentForm() { ... }
```

---

## Mastra Meeting Engine — Pattern

```typescript
// lib/meeting/engine.ts — ไม่ใช่ manual loop อีกต่อไป
import { Mastra, Agent } from "@mastra/core"

// Quick Ask: 1 agent
export async function quickAsk(agentId: string, question: string, send: SSESender) {
  const agent = await loadAgent(agentId)
  const mastraAgent = new Agent({ ... })
  const stream = await mastraAgent.stream(question)
  for await (const chunk of stream) { send("message", chunk) }
}

// Consult: 2-3 agents, ถกเถียงกัน
export async function consult(agentIds: string[], question: string, send: SSESender) {
  const network = new AgentNetwork({ agents: [...] })
  await network.run(question, { onStream: send })
}

// Full Board: 5-phase orchestration
export async function fullBoard(teamId: string, question: string, send: SSESender) {
  // Phase 0: Clarification (Chairman)
  // Phase 1: Parallel Analysis (all agents)
  // Phase 2: Findings (ordered by seniority)
  // Phase 3: Discussion (agents read each other's findings)
  // Phase 4: Synthesis (Chairman summary + memory extract)
}
```

---

## Better Auth — Pattern

```typescript
// auth.ts (root)
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { organization, rbac } from "better-auth/plugins"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  plugins: [
    organization({
      // Workspace = Organization in Better Auth
      roles: ["owner", "admin", "member", "viewer"],
    }),
    rbac(),
  ],
})

// ใช้ใน API route
const session = await auth.api.getSession({ headers: request.headers })
if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })
const workspaceId = session.session.activeOrganizationId
```

---

## SSE Streaming — Pattern

```typescript
// app/api/meetings/stream/route.ts
export async function POST(request: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(
          `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
        ))
      }
      try {
        await runMeeting(config, send)
        send("done", { sessionId })
      } catch (err) {
        send("error", { message: "Meeting failed" })
      } finally {
        controller.close()
      }
    }
  })
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  })
}
```

---

## File Structure (สรุป)

```
app/
  (auth)/login, register
  (dashboard)/
    page.tsx              ← Dashboard home
    meeting/page.tsx      ← Meeting room (main feature)
    agents/page.tsx       ← Agent builder
    teams/page.tsx        ← Team management
    history/page.tsx      ← Meeting history
    memory/page.tsx       ← Memory facts
    settings/page.tsx     ← Workspace settings
  api/
    auth/[...all]/        ← Better Auth handler
    workspaces/           ← Workspace CRUD
    agents/               ← Agent CRUD + knowledge
    teams/                ← Team CRUD
    meetings/stream/      ← SSE meeting stream (CORE)
    memory/               ← Memory CRUD
    stats/                ← Token usage stats
    health/               ← Health check

lib/
  db/schema/              ← Drizzle schemas
  db/queries/             ← All DB access functions
  meeting/engine.ts       ← Mastra orchestration
  meeting/prompts.ts      ← System prompts + anti-hallucination
  integrations/           ← web-search, mcp-client
  documents/parser.ts     ← PDF/Excel/Word parsing
  encryption.ts           ← AES-256-GCM
  rate-limit.ts           ← Redis rate limiting
```

---

## Production Server

- **Host**: `192.168.2.109` (ssh bosscatdog)
- **Port**: `3004`
- **OS**: Ubuntu 24.04, Docker 29.3.0
- **Memory budget**: App 512MB + Postgres 256MB + Redis 128MB

---

## Anti-Patterns (ห้ามทำ)

```
❌ ใช้ any type
❌ Direct SQL ใน route handlers
❌ Store API key โดยไม่ encrypt
❌ Query โดยไม่ filter workspaceId
❌ Hard delete records
❌ Buffer LLM response รอ complete ก่อน stream
❌ ใช้คำว่า "Company" ใน UI (ใช้ "Workspace")
❌ เพิ่ม feature ที่ไม่ได้อยู่ใน plan โดยไม่ถาม
```
