# LEDGIO AI — Project Structure

> File structure, coding conventions, dependencies — อัพเดต April 2026

> ⚠️ **Note**: Next.js 16.2.3 (not 15). Uses `proxy.ts` instead of `middleware.ts`

---

## Full File Tree

```
ledgioai/
├── .github/
│   ├── copilot-instructions.md     # AI coding quick reference (อ่านก่อนเสมอ)
│   └── workflows/
│       └── deploy.yml              # CI/CD: build → push → deploy
│
├── proxy.ts                        # Route protection (Next.js 16 — replaces middleware.ts)
│
├── app/                            # Next.js 16 App Router
│   ├── globals.css
│   ├── layout.tsx                  # Root layout (Providers wrapper)
│   ├── providers.tsx               # Client providers (WorkspaceProvider)
│   │
│   ├── (auth)/                     # หน้า auth — ไม่มี sidebar
│   │   ├── layout.tsx              # Centered card layout + branding
│   │   ├── login/page.tsx          # Login form (authClient.signIn.email)
│   │   └── register/page.tsx       # Register + auto-create workspace
│   │
│   ├── (dashboard)/                # หน้าหลัก — ต้อง login (WorkspaceGuard)
│   │   ├── layout.tsx              # Dashboard layout (sidebar + WorkspaceGuard)
│   │   ├── page.tsx                # Dashboard home: stats cards + quick actions
│   │   │
│   │   ├── meeting/
│   │   │   └── page.tsx            # Meeting room (CORE FEATURE)
│   │   │
│   │   ├── agents/
│   │   │   ├── page.tsx            # Agent list + create
│   │   │   ├── new/page.tsx        # Create agent (จาก template หรือเปล่า)
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Agent detail + edit
│   │   │       └── knowledge/
│   │   │           └── page.tsx    # Knowledge files management
│   │   │
│   │   ├── teams/
│   │   │   ├── page.tsx            # Team list + create
│   │   │   └── [id]/page.tsx       # Team detail + assign agents
│   │   │
│   │   ├── templates/
│   │   │   └── page.tsx            # Agent template gallery
│   │   │
│   │   ├── history/
│   │   │   ├── page.tsx            # Meeting history (search + filter)
│   │   │   └── [id]/page.tsx       # Meeting transcript detail
│   │   │
│   │   ├── memory/
│   │   │   └── page.tsx            # Memory facts (ดู/แก้ไข/ลบ)
│   │   │
│   │   ├── stats/
│   │   │   └── page.tsx            # Token usage stats per agent
│   │   │
│   │   ├── workspaces/
│   │   │   ├── page.tsx            # Workspace list + create new
│   │   │   └── [id]/settings/
│   │   │       └── page.tsx        # Workspace settings + API keys
│   │   │
│   │   └── settings/
│   │       └── page.tsx            # User profile + account settings
│   │
│   └── api/                        # Route Handlers
│       ├── auth/
│       │   └── [...all]/route.ts   # Better Auth handler (catch-all)
│       │
│       ├── workspaces/
│       │   ├── route.ts            # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts        # GET, PUT, DELETE
│       │       ├── members/route.ts
│       │       └── invite/route.ts
│       │
│       ├── agents/
│       │   ├── route.ts            # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts        # GET, PUT, DELETE
│       │       └── knowledge/
│       │           ├── route.ts    # GET list
│       │           ├── upload/route.ts   # POST upload file
│       │           └── [kid]/route.ts    # DELETE knowledge
│       │
│       ├── agent-templates/
│       │   └── route.ts            # GET list (system + workspace templates)
│       │
│       ├── teams/
│       │   ├── route.ts            # GET list, POST create
│       │   └── [id]/route.ts       # GET, PUT, DELETE + manage agents
│       │
│       ├── meetings/
│       │   ├── route.ts            # GET list
│       │   ├── stream/route.ts     # POST → SSE stream (CORE)
│       │   └── [id]/route.ts       # GET detail + transcript
│       │
│       ├── documents/
│       │   └── upload/route.ts     # POST upload for meeting context
│       │
│       ├── memory/
│       │   ├── route.ts            # GET list, POST upsert
│       │   └── [id]/route.ts       # PUT, DELETE
│       │
│       ├── stats/
│       │   └── route.ts            # GET token usage stats
│       │
│       ├── settings/
│       │   └── route.ts            # GET, PUT workspace settings
│       │
│       └── health/
│           └── route.ts            # GET health check (DB + Redis)
│
├── components/
│   ├── ui/                         # Base UI components (shadcn-style)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── textarea.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── avatar.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   └── spinner.tsx
│   │
│   ├── layout/
│   │   ├── sidebar.tsx             # Main sidebar navigation
│   │   ├── workspace-switcher.tsx  # Workspace dropdown (top of sidebar)
│   │   ├── user-menu.tsx           # Avatar dropdown (logout, settings)
│   │   └── breadcrumb.tsx
│   │
│   ├── meeting/
│   │   ├── meeting-room.tsx        # Container: mode selector + stream UI
│   │   ├── mode-selector.tsx       # Quick Ask / Consult / Full Board tabs
│   │   ├── message-bubble.tsx      # Agent message display (streaming)
│   │   ├── agent-avatar-row.tsx    # แสดง agents ที่กำลังประชุม
│   │   ├── clarification-form.tsx  # Phase 0 คำถามจาก Chairman
│   │   ├── file-upload-zone.tsx    # Drag-drop document upload
│   │   ├── web-sources.tsx         # Web search results display
│   │   └── memory-update-toast.tsx # แจ้งเมื่อ extract memory ใหม่
│   │
│   ├── agents/
│   │   ├── agent-card.tsx          # Agent display card (name, role, stats)
│   │   ├── agent-form.tsx          # Create/edit form
│   │   ├── knowledge-list.tsx      # Knowledge files list
│   │   └── soul-editor.tsx         # System prompt textarea + tips
│   │
│   ├── teams/
│   │   ├── team-card.tsx
│   │   └── team-form.tsx           # Create/edit + agent assignment
│   │
│   ├── templates/
│   │   ├── template-gallery.tsx    # Grid แสดง templates
│   │   └── template-card.tsx       # Template preview card
│   │
│   └── providers/
│       ├── workspace-provider.tsx  # Active workspace context + useWorkspace hook
│       └── workspace-guard.tsx     # Auto-creates workspace if missing
│
├── lib/
│   ├── db/
│   │   ├── index.ts                # Drizzle client (postgres.js)
│   │   ├── schema/
│   │   │   ├── index.ts            # Re-export all schemas
│   │   │   ├── agents.ts
│   │   │   ├── agent-knowledge.ts
│   │   │   ├── agent-templates.ts
│   │   │   ├── teams.ts
│   │   │   ├── team-agents.ts
│   │   │   ├── meetings.ts
│   │   │   ├── meeting-messages.ts
│   │   │   ├── memory-facts.ts
│   │   │   ├── agent-stats.ts
│   │   │   └── workspace-settings.ts
│   │   └── queries/                # DB access layer — ห้าม query ตรงใน routes
│   │       ├── workspaces.ts       # ✅ listUserWorkspaces, getUserRole, getMembers
│   │       ├── settings.ts         # ✅ getWorkspaceSettings, upsertWorkspaceSettings
│   │       ├── agents.ts           # ✅ CRUD + countByWorkspace
│   │       ├── agent-knowledge.ts  # ✅ getByAgent, create, delete
│   │       ├── agent-templates.ts  # ✅ getTemplates (system+workspace), getById
│   │       ├── teams.ts            # ✅ CRUD with transaction agent assignment
│   │       ├── meetings.ts
│   │       ├── memory.ts
│   │       └── stats.ts
│   │
│   ├── auth/
│   │   ├── index.ts                # Better Auth instance (export `auth`)
│   │   ├── client.ts               # Better Auth client (frontend + organizationClient)
│   │   └── permissions.ts          # RBAC: hasPermission, requireAuth, requirePermission
│   │
│   ├── meeting/
│   │   ├── engine.ts               # Main entry: runMeeting(config, send)
│   │   ├── modes/
│   │   │   ├── quick-ask.ts        # 1-agent streaming
│   │   │   ├── consult.ts          # 2-3 agents parallel + discussion
│   │   │   └── full-board.ts       # 5-phase orchestration
│   │   ├── context.ts              # buildMeetingContext()
│   │   ├── prompts.ts              # System prompts + anti-hallucination
│   │   ├── chairman.ts             # detectChairman, sortBySeniority
│   │   ├── memory.ts               # extractMemoryFacts()
│   │   └── model.ts                # buildModel(agent) → Vercel AI SDK model
│   │
│   ├── mastra/
│   │   └── index.ts                # Mastra instance (PgMemory backend)
│   │
│   ├── integrations/
│   │   ├── web-search.ts           # Serper + SerpApi + query rewriting
│   │   └── mcp-client.ts           # MCP protocol client
│   │
│   ├── documents/
│   │   └── parser.ts               # ✅ PDF/Excel/Word/CSV/JSON/TXT/MD parser (single file)
│   │
│   ├── domain-knowledge.ts         # Built-in Thai tax/accounting/labor rules
│   ├── encryption.ts               # AES-256-GCM encrypt/decrypt
│   ├── rate-limit.ts               # Redis-backed rate limiting
│   ├── redis.ts                    # ioredis client singleton
│   ├── logger.ts                   # Pino structured logger
│   │
│   ├── validations/                # Zod schemas (validate API input)
│   │   ├── agent.ts
│   │   ├── team.ts
│   │   ├── meeting.ts
│   │   ├── workspace.ts
│   │   └── settings.ts
│   │
│   └── utils.ts                    # cn(), formatDate(), truncate(), etc.
│
├── drizzle/                        # Generated SQL migrations
├── scripts/
│   ├── seed.ts                     # Dev seed: templates + sample workspace
│   ├── seed-templates.ts           # Seed built-in agent templates
│   ├── migrate-from-bossboard.ts   # Phase 9: BossBoard → PostgreSQL
│   └── verify-migration.ts
│
├── types/
│   └── index.ts                    # Shared TypeScript types
│
├── docs/                           # Planning documents
│
├── auth.ts                         # (ไม่มีแล้ว — Better Auth ใช้ lib/auth/index.ts)
├── middleware.ts                   # Protect (dashboard) routes
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── .env.example
```

---

## Coding Standards

### TypeScript

```typescript
// ✅ strict mode เสมอ
// ✅ interface สำหรับ object shapes
interface AgentRow {
  id: string
  workspaceId: string
  name: string
  soul: string
}

// ✅ type สำหรับ unions
type MeetingMode = "quick_ask" | "consult" | "full_board"
type MeetingStatus = "running" | "completed" | "error" | "cancelled"

// ❌ ห้ามใช้ any
const data: any = ...  // ผิด
const data: unknown = ...  // ถูก — แล้วค่อย narrow
```

### React Components

```typescript
// Server Component by default — ไม่ต้อง declare
export default async function AgentsPage() {
  const agents = await getAgentsByWorkspace(workspaceId)
  return <AgentList agents={agents} />
}

// "use client" เฉพาะเมื่อ: useState, useEffect, onClick, browser APIs
"use client"
export function AgentForm({ onSubmit }: { onSubmit: (data: AgentInput) => void }) {
  const [name, setName] = useState("")
  ...
}
```

### File & Export Naming

| สิ่ง | Convention | ตัวอย่าง |
|-----|-----------|---------|
| Files | kebab-case | `agent-card.tsx`, `call-llm.ts` |
| Components | PascalCase export | `export function AgentCard()` |
| Utilities | camelCase export | `export function buildModel()` |
| Types/Interfaces | PascalCase | `interface MeetingConfig` |
| Enums (Drizzle) | camelCase values | `pgEnum("mode", ["quick_ask", ...])` |

### Imports Order

```typescript
// 1. External packages
import { Agent } from "@mastra/core"
import { eq, and, isNull } from "drizzle-orm"

// 2. Internal lib
import { db } from "@/lib/db"
import { agents } from "@/lib/db/schema"

// 3. Components
import { AgentCard } from "@/components/agents/agent-card"

// 4. Relative (หลีกเลี่ยงถ้าทำได้)
import { buildModel } from "./model"
```

### API Route Pattern

```typescript
// app/api/agents/route.ts
import { auth } from "@/lib/auth"
import { getAgentsByWorkspace } from "@/lib/db/queries/agents"
import { createAgentSchema } from "@/lib/validations/agent"

export async function GET(request: Request) {
  // 1. Auth check
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  // 2. Get workspace
  const workspaceId = session.session.activeOrganizationId
  if (!workspaceId) return Response.json({ error: "No active workspace" }, { status: 400 })

  // 3. Query (always with workspaceId)
  const agents = await getAgentsByWorkspace(workspaceId)
  return Response.json({ data: agents })
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  // 4. Validate input
  const body = await request.json()
  const parsed = createAgentSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  // 5. Business logic
  const agent = await createAgent(session.session.activeOrganizationId!, parsed.data)
  return Response.json({ data: agent }, { status: 201 })
}
```

### DB Query Pattern

```typescript
// lib/db/queries/agents.ts — ทุก function ต้องรับ workspaceId
import { db } from "@/lib/db"
import { agents, agentKnowledge } from "@/lib/db/schema"
import { eq, and, isNull } from "drizzle-orm"

export async function getAgentsByWorkspace(workspaceId: string) {
  return db.query.agents.findMany({
    where: and(
      eq(agents.workspaceId, workspaceId),
      isNull(agents.deletedAt)           // soft delete filter เสมอ
    ),
    orderBy: (agents, { asc }) => [asc(agents.seniority)],
  })
}

export async function getAgentById(agentId: string, workspaceId: string) {
  // ต้อง verify workspaceId ด้วย — ห้าม query แค่ id อย่างเดียว
  return db.query.agents.findFirst({
    where: and(
      eq(agents.id, agentId),
      eq(agents.workspaceId, workspaceId),
      isNull(agents.deletedAt)
    ),
  })
}

export async function softDeleteAgent(agentId: string, workspaceId: string) {
  return db
    .update(agents)
    .set({ deletedAt: new Date() })
    .where(and(eq(agents.id, agentId), eq(agents.workspaceId, workspaceId)))
}
```

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",

    "better-auth": "^1.0.0",

    "@mastra/core": "^0.5.0",
    "@mastra/pg": "^0.5.0",
    "@ai-sdk/anthropic": "^1.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "@ai-sdk/google": "^1.0.0",
    "ai": "^4.0.0",

    "drizzle-orm": "^0.35.0",
    "postgres": "^3.4.0",

    "ioredis": "^5.4.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.0",
    "pino": "^9.0.0",

    "lucide-react": "^0.400.0",
    "react-markdown": "^10.1.0",
    "remark-gfm": "^4.0.1",

    "mammoth": "^1.12.0",
    "pdf-parse": "^2.4.5",
    "xlsx": "^0.18.5",

    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/bcryptjs": "^2.4.0",
    "drizzle-kit": "^0.28.0",
    "pino-pretty": "^11.0.0"
  }
}
```

---

## Config Files

### next.config.ts

```typescript
import type { NextConfig } from "next"

const config: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "pino", "pino-pretty", "pdf-parse",
    "@mastra/core", "@mastra/pg",
  ],
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }]
  },
}

export default config
```

### middleware.ts

```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers })

  // ถ้าไม่มี session และพยายามเข้า dashboard → redirect login
  if (!session && request.nextUrl.pathname.startsWith("/(dashboard)")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // ถ้า login แล้วพยายามเข้า auth pages → redirect dashboard
  if (session && (
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/register"
  )) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

### .env.example

```bash
# Database
DATABASE_URL=postgresql://ledgio:password@localhost:5434/ledgio

# Redis
REDIS_URL=redis://localhost:6380

# Encryption (generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your_64_hex_chars_here

# Better Auth
BETTER_AUTH_SECRET=your_secret_here
BETTER_AUTH_URL=http://localhost:3004

# Next.js
NEXTAUTH_URL=http://localhost:3004
NODE_ENV=development

# Web Search (optional)
SERPER_API_KEY=
SERP_API_KEY=

# Sentry (optional, Phase 7)
SENTRY_DSN=
```

---

## Environment-Specific Notes

### Development

```bash
npm run dev          # Next.js dev server port 3004
npx drizzle-kit push # Apply schema changes (dev)
npx tsx scripts/seed.ts  # Seed dev data + templates
```

### Production (Docker)

```bash
docker compose up -d            # Start all services
docker compose logs -f app      # Follow logs
docker compose exec app sh      # Shell into container
```

---

## Error Response Format

```typescript
// Success
{ "data": T }
{ "data": T[], "total": number, "page": number, "pageSize": number }

// Error
{ "error": "Human-readable message" }          // 400, 401, 403, 404
{ "error": { fieldErrors: { ... } } }          // 422 validation
{ "error": "Internal server error" }           // 500 (never leak DB errors)
```
