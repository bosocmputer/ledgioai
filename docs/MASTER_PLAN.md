# LEDGIO AI — Master Implementation Plan

> แผนการพัฒนาเต็มระบบ จาก BossBoard demo → LEDGIO AI production

## 🎯 Vision

LEDGIO AI เป็น Multi-Tenant SaaS platform สำหรับสำนักงานบัญชีไทย ที่มี AI Board Meeting Room ให้คำปรึกษาด้านบัญชี ภาษี ตรวจสอบ วิเคราะห์งบ — ขายเป็นแพ็คเกจให้เจ้าของธุรกิจที่มีหลายบริษัท

## 📊 Current State (BossBoard Demo)

### สิ่งที่มีแล้ว (Working)
- ✅ Multi-Agent AI Meeting — 5-Phase Flow (Clarification → Analysis → Findings → Discussion → Synthesis)
- ✅ 6 LLM Providers (Anthropic, OpenRouter, OpenAI, Gemini, Ollama, Custom)
- ✅ Document Upload & Parsing (PDF, Excel, Word, CSV, JSON, Text)
- ✅ MCP Integration ดึงข้อมูลจากระบบ ERP
- ✅ Web Search (Serper + SerpApi fallback)
- ✅ Agent Knowledge Base (upload เอกสารเฉพาะ agent)
- ✅ Cross-Session Memory (จำข้อมูลข้ามเซสชัน)
- ✅ Agent Statistics (token usage tracking)
- ✅ Domain Knowledge (built-in ความรู้ภาษี/บัญชี/แรงงานไทย)
- ✅ Anti-Hallucination Rules
- ✅ Rate Limiting
- ✅ AES-256-CBC API Key Encryption
- ✅ Prompt Caching (Anthropic)

### สิ่งที่ต้องสร้างใหม่ (Production Requirements)
- ❌ Database (ยังใช้ JSON files)
- ❌ Authentication / User System
- ❌ Multi-Company / Multi-Tenant
- ❌ RBAC (Role-Based Access Control)
- ❌ Vector Store / RAG (ยัง context stuff 40K chars)
- ❌ LLM Gateway (ยัง direct fetch ทุก provider)
- ❌ Background Job Queue
- ❌ Proper Caching Layer
- ❌ Monitoring & Logging
- ❌ CI/CD Pipeline
- ❌ Billing / Subscription (future)

---

## 🗂️ Implementation Phases

### Phase 1: Foundation — Project Setup & Database (Week 1-2)

**เป้าหมาย**: ตั้งโปรเจคใหม่ + PostgreSQL database + Drizzle ORM

| Task | Detail | Priority |
|------|--------|----------|
| 1.1 | Init Next.js 15 project with TypeScript, Tailwind 4, App Router | P0 |
| 1.2 | Setup Drizzle ORM + PostgreSQL connection | P0 |
| 1.3 | สร้าง database schema ทั้งหมด (ดู DATABASE_SCHEMA.md) | P0 |
| 1.4 | เขียน migration scripts (drizzle-kit) | P0 |
| 1.5 | Setup connection pooling (pg pool) | P0 |
| 1.6 | สร้าง seed script สำหรับ development data | P1 |
| 1.7 | Setup Docker Compose (app + postgres + redis) | P0 |

**Deliverable**: Next.js app ที่ connect PostgreSQL ได้, schema ครบ, docker-compose ทำงานได้

### Phase 2: Authentication & User System (Week 2-3)

**เป้าหมาย**: NextAuth v5 + User registration/login + Session management

| Task | Detail | Priority |
|------|--------|----------|
| 2.1 | Install & configure NextAuth v5 (Auth.js) with Drizzle adapter | P0 |
| 2.2 | Email/Password credentials provider | P0 |
| 2.3 | Google OAuth provider (optional, easy to add) | P2 |
| 2.4 | Session management (JWT + database sessions) | P0 |
| 2.5 | Protected route middleware (auth check) | P0 |
| 2.6 | Login / Register pages | P0 |
| 2.7 | User profile page + password change | P1 |
| 2.8 | API route authentication (getServerSession) | P0 |

**Deliverable**: User สามารถ register, login, logout ได้ + ทุก API route ต้อง authenticated

### Phase 3: Multi-Company / Multi-Tenant (Week 3-4)

**เป้าหมาย**: ผู้ใช้สร้างหลายบริษัทได้, ข้อมูลทั้งหมด scope ตาม companyId

| Task | Detail | Priority |
|------|--------|----------|
| 3.1 | Company CRUD API (create, read, update, delete) | P0 |
| 3.2 | User-Company relationship (junction table, roles: owner/admin/member) | P0 |
| 3.3 | Company switcher UI ใน sidebar | P0 |
| 3.4 | Active company context (cookie/session based) | P0 |
| 3.5 | Scope ทุก query ด้วย companyId (agents, teams, sessions, memory, stats) | P0 |
| 3.6 | Company settings (แยก companyInfo, API keys per company) | P0 |
| 3.7 | Default company creation on first login | P1 |
| 3.8 | Company invitation system (invite by email) | P2 |

**Deliverable**: ผู้ใช้สลับบริษัทได้, ข้อมูลแยก scope อย่างสมบูรณ์

### Phase 4: Core Business Logic Migration (Week 4-6)

**เป้าหมาย**: ย้าย business logic จาก BossBoard → LEDGIO AI (DB-backed)

| Task | Detail | Priority |
|------|--------|----------|
| 4.1 | Agent CRUD — สร้าง/แก้ไข/ลบ agent (database, encrypted API keys) | P0 |
| 4.2 | Team CRUD — สร้าง/แก้ไข/ลบ team + assign agents | P0 |
| 4.3 | Research Session — สร้าง/อ่าน/complete session (database) | P0 |
| 4.4 | Research Messages — append messages, streaming SSE | P0 |
| 4.5 | **Meeting Flow Engine** — 5-Phase flow (ย้ายจาก stream/route.ts) | P0 |
| 4.6 | callLLM() — Multi-provider LLM calls (6 providers) | P0 |
| 4.7 | Web Search — Serper + SerpApi with trusted URL scoping | P0 |
| 4.8 | MCP Integration — fetchMcpContext() with tool scoring | P0 |
| 4.9 | Document Upload & Parsing (PDF/Excel/Word/CSV/JSON) | P0 |
| 4.10 | Agent Knowledge Base — upload, store, retrieve, rank by relevance | P0 |
| 4.11 | Cross-Session Memory — upsert/read memory facts | P0 |
| 4.12 | Agent Statistics — token usage, session count, daily stats | P0 |
| 4.13 | Domain Knowledge — built-in Thai tax/accounting knowledge | P0 |
| 4.14 | Settings — per-company settings with encrypted API keys | P0 |
| 4.15 | Rate Limiting — per-user + per-company rate limiting | P0 |

**Deliverable**: ทุก feature ของ BossBoard ทำงานบน PostgreSQL + scoped by company

### Phase 5: AI Enhancement (Week 6-8)

**เป้าหมาย**: Supermemory integration, LLM streaming, improved RAG

| Task | Detail | Priority |
|------|--------|----------|
| 5.1 | Supermemory API integration (vector memory) | P1 |
| 5.2 | True SSE streaming from LLM → client (ปัจจุบัน wait-for-complete) | P1 |
| 5.3 | Token usage optimization (smarter context window management) | P1 |
| 5.4 | Conversation summarization (auto-compress long history) | P2 |
| 5.5 | Agent persona refinement engine | P2 |
| 5.6 | Multi-language support (Thai primary, English secondary) | P2 |

**Deliverable**: ระบบ AI ที่ smart + efficient + stream real-time

### Phase 6: UI/UX Production (Week 8-10)

**เป้าหมาย**: Production-ready UI

| Task | Detail | Priority |
|------|--------|----------|
| 6.1 | Responsive design (mobile-first) | P1 |
| 6.2 | Company switcher + sidebar redesign | P0 |
| 6.3 | Dashboard — overview ของ usage, recent sessions, quick stats | P1 |
| 6.4 | Meeting room — real-time streaming UI | P0 |
| 6.5 | Agent management — CRUD + knowledge upload | P0 |
| 6.6 | Team management | P0 |
| 6.7 | Research history — search, filter, pagination | P1 |
| 6.8 | Settings page — company info, API keys, web search config | P0 |
| 6.9 | User profile + account settings | P1 |
| 6.10 | Error handling + loading states + empty states | P1 |
| 6.11 | Dark mode (already partially done) | P2 |
| 6.12 | i18n framework (Thai/English) | P2 |

**Deliverable**: Production UI ที่สวย, responsive, UX ดี

### Phase 7: Infrastructure & DevOps (Week 10-11)

**เป้าหมาย**: Production-grade infrastructure

| Task | Detail | Priority |
|------|--------|----------|
| 7.1 | Docker Compose production config | P0 |
| 7.2 | Health check endpoints | P0 |
| 7.3 | Structured logging (pino) | P1 |
| 7.4 | Error tracking (Sentry — free tier) | P1 |
| 7.5 | Database backup automation (pg_dump cron) | P0 |
| 7.6 | GitHub Actions CI/CD pipeline | P1 |
| 7.7 | Cloudflare Tunnel configuration | P0 |
| 7.8 | SSL/TLS (via Cloudflare) | P0 |
| 7.9 | Environment variable management | P0 |
| 7.10 | Zero-downtime deployment strategy | P2 |

**Deliverable**: ระบบ deploy ได้อย่างมั่นใจ, มี monitoring + backup

### Phase 8: Security Hardening (Week 11-12)

**เป้าหมาย**: Production security

| Task | Detail | Priority |
|------|--------|----------|
| 8.1 | Input validation (zod schemas ทุก API) | P0 |
| 8.2 | CSRF protection | P0 |
| 8.3 | XSS prevention (Content-Security-Policy headers) | P0 |
| 8.4 | SQL injection prevention (Drizzle parameterized queries) | P0 |
| 8.5 | Rate limiting (per-user, per-IP, per-endpoint) | P0 |
| 8.6 | API key encryption (AES-256-GCM upgrade from CBC) | P1 |
| 8.7 | PDPA compliance (Thai data protection law) | P1 |
| 8.8 | Audit logging (who did what when) | P1 |
| 8.9 | Secret management (env vars, not filesystem) | P0 |
| 8.10 | Dependency vulnerability scanning | P1 |

**Deliverable**: ผ่าน security checklist สำหรับ production

### Phase 9: Data Migration (Week 12)

**เป้าหมาย**: Migrate ข้อมูลจาก BossBoard JSON → LEDGIO AI PostgreSQL

| Task | Detail | Priority |
|------|--------|----------|
| 9.1 | Migration script: agents.json → agents table | P0 |
| 9.2 | Migration script: teams.json → teams table | P0 |
| 9.3 | Migration script: research-history.json → sessions + messages | P0 |
| 9.4 | Migration script: settings.json → company_settings table | P0 |
| 9.5 | Migration script: client-memory.json → memory_facts table | P0 |
| 9.6 | Migration script: agent-stats.json → agent_stats table | P0 |
| 9.7 | Verify migration — data integrity check | P0 |
| 9.8 | Rollback plan | P0 |

**Deliverable**: ข้อมูลเดิมทั้งหมดย้ายมาสำเร็จ ไม่สูญหาย

### Phase 10: Future — Billing & Subscription (TBD)

| Task | Detail | Priority |
|------|--------|----------|
| 10.1 | Subscription plans (Free/Pro/Enterprise) | P3 |
| 10.2 | Usage metering (token count per company) | P3 |
| 10.3 | Payment integration (Stripe or local gateway) | P3 |
| 10.4 | Admin panel (super admin dashboard) | P3 |
| 10.5 | Marketplace — shared agent templates | P3 |

---

## 🔧 Tech Stack Summary

| Layer | Technology | Why |
|-------|-----------|-----|
| **Framework** | Next.js 15 (App Router) | SSR + API routes + RSC, same as demo |
| **Language** | TypeScript 5 | Type safety |
| **UI** | React 19 + Tailwind CSS 4 | Same as demo |
| **Icons** | Lucide React | Same as demo |
| **Markdown** | react-markdown + remark-gfm | Same as demo |
| **Database** | PostgreSQL 16 | Relational, JSON support, already on server |
| **ORM** | Drizzle ORM | Type-safe, lightweight, great DX |
| **Auth** | NextAuth v5 (Auth.js) | Standard for Next.js, Drizzle adapter |
| **Cache** | Redis 7 | Sessions, rate limit, caching (already on server) |
| **Queue** | BullMQ | Background jobs (optional Phase 5+) |
| **Vector Memory** | Supermemory API | Free tier 1M tokens/month |
| **Doc Parsing** | pdf-parse, mammoth, xlsx | Same as demo |
| **Validation** | Zod | Input validation |
| **Logging** | Pino | Structured logging |
| **Encryption** | AES-256-GCM | API key encryption (upgrade from CBC) |
| **Container** | Docker + Docker Compose | Same deployment model |
| **CI/CD** | GitHub Actions | Automated build + deploy |
| **CDN/Tunnel** | Cloudflare | Already in use |

---

## 📁 Key Files from BossBoard to Study

เมื่อ implement ให้อ่านไฟล์เหล่านี้จาก BossBoard demo เพื่อเข้าใจ business logic:

| BossBoard File | What it does | Migrate to |
|----------------|-------------|------------|
| `lib/agents-store.ts` | ทุกฟังก์ชัน data access — agents, teams, sessions, memory, stats, encryption | `lib/db/*.ts` (Drizzle queries) |
| `app/api/team-research/stream/route.ts` | Meeting flow engine — callLLM, 5-phase, MCP, web search | `lib/meeting-engine.ts` |
| `app/api/team-research/upload/route.ts` | Document parsing — PDF, Excel, Word, CSV, JSON | `lib/document-parser.ts` |
| `lib/domain-knowledge.ts` | Built-in Thai tax/accounting rules | Copy + enhance |
| `lib/rate-limit.ts` | In-memory rate limiting | Redis-backed rate limit |
| `app/sidebar.tsx` | Navigation sidebar | Add company switcher |
| `app/page.tsx` | Main research/meeting page | Split into dashboard + meeting |
| `app/agents/page.tsx` | Agent management CRUD | Add companyId scoping |
| `app/teams/page.tsx` | Team management | Add companyId scoping |
| `app/settings/page.tsx` | Settings page | Per-company settings |

---

## 🗓️ Timeline Summary

| Phase | Duration | Focus |
|-------|----------|-------|
| Phase 1 | Week 1-2 | Foundation + Database |
| Phase 2 | Week 2-3 | Authentication |
| Phase 3 | Week 3-4 | Multi-Company |
| Phase 4 | Week 4-6 | Core Business Logic |
| Phase 5 | Week 6-8 | AI Enhancement |
| Phase 6 | Week 8-10 | UI/UX Production |
| Phase 7 | Week 10-11 | Infrastructure |
| Phase 8 | Week 11-12 | Security |
| Phase 9 | Week 12 | Data Migration |
| Phase 10 | TBD | Billing (future) |

**Total: ~12 weeks สำหรับ production-ready MVP**

---

## ⚠️ Critical Decisions

1. **Database**: PostgreSQL (reuse existing instance on server port 5434 or create new)
2. **ORM**: Drizzle (not Prisma — lighter, faster, better for this scale)
3. **Auth**: NextAuth v5 with credentials + optional OAuth
4. **Multi-Tenant Strategy**: Shared database, row-level isolation via `companyId`
5. **Encryption**: Upgrade to AES-256-GCM (from CBC), key from environment variable
6. **LLM Calls**: Keep direct fetch (no AI SDK) — proven in demo, less abstraction
7. **Streaming**: Implement true SSE streaming (demo waits for complete response)

---

*ดูรายละเอียดแต่ละหัวข้อในเอกสาร docs/ แยกแต่ละไฟล์*
