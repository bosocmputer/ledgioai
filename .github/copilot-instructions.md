# LEDGIO AI — Copilot Instructions

> Context file for Claude Opus 4.6 in VS Code. Read this FIRST before any implementation.

## What Is This Project?

**LEDGIO AI** is a multi-tenant SaaS rebuild of the BossBoard demo — an AI "board meeting room" where specialized AI agents (Thai accounting, tax, labor law, business analysis experts) hold structured meetings to give advisory answers to SME business owners.

**Target users**: Thai businesses (multiple companies per user, e.g., bookkeeping firms managing many clients).

**Language**: UI in Thai, code in English.

## 📖 Read Order

Read these documents in order before starting:

1. **`docs/MASTER_PLAN.md`** — Phases, timeline, tech stack
2. **`docs/DATABASE_SCHEMA.md`** — All 15 tables with Drizzle schema code
3. **`docs/AUTH_SYSTEM.md`** — NextAuth v5 + RBAC
4. **`docs/MULTI_TENANT.md`** — Company switching, data isolation
5. **`docs/PROJECT_STRUCTURE.md`** — File structure, conventions, dependencies
6. **`docs/AI_INTEGRATION.md`** — LLM providers, meeting engine, web search, document parsing
7. **`docs/API_SPEC.md`** — Every endpoint specification
8. **`docs/INFRASTRUCTURE.md`** — Docker, deploy, monitoring
9. **`docs/MIGRATION.md`** — BossBoard data migration (do last)

## 🔨 Implementation Order

Follow the phases in MASTER_PLAN.md strictly:

### Phase 1: Foundation (Week 1-2)
1. `npm create next-app@latest . --typescript --tailwind --app --src=no`
2. Install dependencies per PROJECT_STRUCTURE.md
3. Set up `lib/db/index.ts` (Drizzle + postgres.js)
4. Create ALL schema files in `lib/db/schema/` per DATABASE_SCHEMA.md
5. Run `npx drizzle-kit generate` + `npx drizzle-kit migrate`
6. Create `auth.ts`, `middleware.ts` per AUTH_SYSTEM.md
7. Create `.env.example` and `.env.local`

### Phase 2: Auth (Week 2)
8. Login/register pages in `app/(auth)/`
9. Registration API with transaction (user + company + owner role)
10. Auth middleware protecting `(dashboard)` routes

### Phase 3: Multi-Tenant (Week 3)
11. Company CRUD APIs
12. Company switcher component
13. `CompanyProvider` context
14. Verify ALL business queries filter by companyId

### Phase 4: Core Business Logic (Week 4-6)
15. Agent CRUD (forms, API, knowledge upload)
16. Team CRUD (forms, API)
17. `lib/llm/call-llm.ts` — multi-provider LLM caller
18. Meeting engine in `lib/meeting/` (all 5 phases)
19. SSE streaming endpoint `api/meetings/stream`
20. Meeting room UI

### Phase 5+: Enhancement
21. Agent statistics, memory system, web search, MCP integration
22. Settings, billing preparation
23. Docker deployment

## ⚠️ Critical Rules

### Security
- **ALWAYS** filter by `companyId` on every business query
- **NEVER** expose raw database errors to clients
- **NEVER** store API keys in code — use environment variables
- API keys in DB are encrypted with AES-256-GCM (see `lib/encryption.ts`)
- Hash passwords with bcryptjs (cost 12)
- Rate limit: 10 req/min for auth, 30/min for mutations, 200/min for reads

### Architecture
- Server Components by default, `"use client"` only when needed
- All database access through `lib/db/queries/*.ts`
- No direct SQL in route handlers
- Use Zod for ALL input validation in API routes
- Transactions for multi-table writes
- Next.js `output: "standalone"` for Docker

### Meeting Engine
- The 5 phases are: Clarification → Analysis → Findings → Discussion → Synthesis
- Chairman = highest seniority in the team, speaks first/last
- Each agent has a unique `voice` (speaking style)
- Anti-hallucination: agents must cite sources or say "ไม่แน่ใจ"
- SSE events: `phase`, `agent-start`, `agent-message`, `agent-done`, `sources`, `error`, `complete`

### Multi-Tenant
- `companyId` column on: agents, teams, research_sessions, memory_facts, agent_stats, company_settings
- Use cookie `active-company-id` for company switching
- Junction table `user_companies` has `role` enum: owner, admin, member, viewer

## 🖥️ Production Server

- **IP**: 192.168.2.109 (ssh bosscatdog)
- **Specs**: Intel i3-8100, 7.6GB RAM, no GPU, 25GB free disk
- **OS**: Ubuntu 24.04, Docker 29.3.0
- **Existing services**: PostgreSQL (5432, 5434), Redis (6380), Cloudflare tunnels
- **Budget**: App 512MB + Postgres 256MB + Redis 128MB ≈ 900MB total

## 🔗 Key Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| ORM | Drizzle | Type-safe, lightweight, SQL-like |
| Auth | NextAuth v5 | App Router native, Drizzle adapter |
| DB | PostgreSQL | Relations, JSONB, proven |
| Cache | Redis (ioredis) | Rate limiting, session cache |
| Encryption | AES-256-GCM | Authenticated encryption (not CBC) |
| LLM | Direct fetch() | No SDK bloat, control streaming |
| CSS | Tailwind 4 | Same as BossBoard demo |
| Deploy | Docker standalone | Consistent, resource-controlled |

## 🗂️ BossBoard → LEDGIO AI Mapping

| BossBoard | LEDGIO AI |
|-----------|-----------|
| `lib/agents-store.ts` (all CRUD) | Split into `lib/db/queries/*.ts` per entity |
| `app/api/team-research/stream/route.ts` | `lib/meeting/engine.ts` + `app/api/meetings/stream/route.ts` |
| JSON files in `~/.bossboard/` | PostgreSQL tables |
| AES-256-CBC | AES-256-GCM |
| No auth | NextAuth v5 + RBAC |
| Global data | companyId on every table |
| `callLLM()` inline | `lib/llm/call-llm.ts` + provider modules |
