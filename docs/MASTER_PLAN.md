# LEDGIO AI — Master Plan (Revised)

> แผนการพัฒนาเต็มระบบ — อัพเดต April 2026

---

## 🎯 Vision & Core Value Proposition

**"คุณไม่ต้องจ้างที่ปรึกษาหลายคน — แค่สร้าง AI Expert Team ของคุณเองใน LEDGIO AI"**

LEDGIO AI คือ **AI Expert Team Builder** — platform ที่ให้ผู้ใช้สร้างทีมผู้เชี่ยวชาญ AI หลายด้านแล้วให้พวกเขา **ประชุม ถกเถียง และหาคำตอบร่วมกัน** แบบเดียวกับการจ้างทีมที่ปรึกษาจริงๆ แต่ราคาถูกกว่ามาก

### ตัวอย่าง Use Case จริง

**เจ้าของบริษัทถามว่า**: "ปีนี้ควรจดทะเบียน VAT ไหม ถ้าจดแล้วผลกระทบต่อลูกค้ารายย่อยเป็นยังไง?"

**แทนที่จะถาม ChatGPT คนเดียว** → LEDGIO AI ให้:
- 🧑‍💼 **ที่ปรึกษาภาษี** วิเคราะห์เงื่อนไขกฎหมาย VAT มาตรา 81
- 📊 **นักวิเคราะห์การเงิน** คำนวณ impact ต่อ cash flow และราคาขาย
- 🔍 **นักบัญชีอาวุโส** ชี้ขั้นตอน compliance และเอกสารที่ต้องเตรียม
- ⚖️ **ผู้ตรวจสอบภายใน** เตือนความเสี่ยงและ red flags ที่อาจเกิดขึ้น

ทั้ง 4 คน **ถกเถียงกัน** → สรุปคำแนะนำที่รอบด้านให้เจ้าของบริษัทตัดสินใจได้เลย

### กลุ่มลูกค้าหลัก

| กลุ่ม | Use Case | Value |
|-------|----------|-------|
| **สำนักงานบัญชี** | สร้างทีม AI expert ช่วยตอบคำถามลูกค้าซับซ้อน | ลดเวลาค้นหา ไม่ต้องจำทุกมาตรา |
| **เจ้าของธุรกิจ SME** | มีที่ปรึกษา AI ที่รู้จักบริษัทตัวเอง | ประหยัดค่าที่ปรึกษา |
| **CFO / ผู้บริหารการเงิน** | Board meeting เสมือนจริงก่อนตัดสินใจใหญ่ | ลด risk จากการตัดสินใจพลาด |
| **นักบัญชีอิสระ (Freelance)** | สร้าง expert ช่วยตัวเองในงานที่ไม่ถนัด | เพิ่มขีดความสามารถ |

---

## 📊 สิ่งที่มีอยู่แล้ว (BossBoard Demo)

### Working Features
- ✅ Multi-Agent AI Meeting — 5-Phase Flow
- ✅ 6 LLM Providers (Anthropic, OpenRouter, OpenAI, Gemini, Ollama, Custom)
- ✅ Document Upload & Parsing (PDF, Excel, Word, CSV)
- ✅ MCP Integration (ERP data)
- ✅ Web Search (Serper + SerpApi)
- ✅ Agent Knowledge Base
- ✅ Cross-Session Memory
- ✅ Agent Statistics
- ✅ Domain Knowledge (Thai tax/accounting)
- ✅ Anti-Hallucination Rules
- ✅ Prompt Caching (Anthropic)

### สิ่งที่ต้องสร้างใหม่ (Production)
- ❌ Database (ยังใช้ JSON files)
- ❌ Authentication / User System
- ❌ Multi-Workspace / Multi-Tenant
- ❌ RBAC
- ❌ Agent Templates Marketplace (ใหม่)
- ❌ 3-Tier Meeting Modes (ใหม่)
- ❌ Monitoring & CI/CD

---

## 🏗️ Architecture Decision (Updated April 2026)

| Layer | เดิม (Plan) | ใหม่ (Revised) | เหตุผล |
|-------|------------|----------------|--------|
| **Auth** | NextAuth v5 | **Better Auth** | Built-in organizations, RBAC, 2FA ไม่ต้องเขียนเอง |
| **Meeting Engine** | เขียนเอง ~800 lines | **Mastra AI** | TypeScript-native, AgentNetwork, Memory, MCP built-in |
| **DB/ORM** | PostgreSQL + Drizzle | PostgreSQL + Drizzle | เหมือนเดิม ดีอยู่แล้ว |
| **Cache** | Redis | Redis | เหมือนเดิม |
| **Deploy** | Docker + GitHub Actions | Docker + GitHub Actions | เหมือนเดิม |

### ทำไมถึงเปลี่ยน

**Better Auth** แทน NextAuth v5:
- `organizations` plugin = แทน `user_companies` junction table ที่ต้องเขียนเอง
- `RBAC` plugin = owner/admin/member/viewer built-in
- 2FA, Passkeys, Email verification included
- Drizzle adapter รองรับ full — ไม่ต้องเขียน schema auth เอง

**Mastra** แทน manual meeting engine:
- AgentNetwork orchestrates หลาย agents พร้อมกัน — ตรงกับ 5-phase meeting
- Memory system built-in — แทน Supermemory API (third-party dependency)
- MCP protocol built-in — เชื่อม ERP/Centrix ได้ทันที
- 100+ LLM providers ผ่าน Vercel AI SDK
- SSE Streaming built-in
- Production-proven: Replit, PayPal, SoftBank ใช้แล้ว

---

## 🎭 Product Features (Core)

### 1. Agent Builder — สร้าง "ผู้เชี่ยวชาญ" ของตัวเอง

ผู้ใช้สร้าง agent ได้อย่างอิสระ ไม่จำกัดแค่บัญชี/ภาษี:

```
ตัวอย่าง agents ที่สร้างได้:
👨‍⚖️ ที่ปรึกษากฎหมายแรงงาน
📊 นักวิเคราะห์ตลาด
🏭 วิศวกรการผลิต (OEE, Lean)
💊 ที่ปรึกษาการจัดซื้อยา (โรงพยาบาล)
🏗️ ผู้ตรวจสอบสัญญาก่อสร้าง
🌾 ที่ปรึกษาเกษตรกรรม
```

แต่ละ agent มี:
- **Soul (System Prompt)** — บุคลิก ความเชี่ยวชาญ วิธีการพูด
- **Knowledge Base** — เอกสารเฉพาะทาง อัพโหลดได้
- **LLM Provider** — เลือก model ที่เหมาะกับงาน
- **Web Search** — ค้นหาข้อมูลล่าสุดได้
- **Trusted Sources** — กำหนด domain ที่เชื่อถือได้
- **MCP Connection** — ดึงข้อมูลจากระบบภายนอก

### 2. Team Builder — จัดทีมผู้เชี่ยวชาญ

จัดกลุ่ม agents เป็น "ทีม" สำหรับงานต่างๆ:

```
ตัวอย่างทีม:
🏛️ "คณะกรรมการบัญชีและภาษี"
   → ที่ปรึกษาภาษี + นักบัญชี + ผู้ตรวจสอบ

⚖️ "ทีมที่ปรึกษากฎหมายธุรกิจ"
   → ทนายความ + นักบัญชี + ที่ปรึกษาการเงิน

📈 "คณะวิเคราะห์การลงทุน"
   → นักวิเคราะห์ + ผู้ตรวจสอบความเสี่ยง + CFO AI
```

### 3. Meeting Room — 3 Modes ตามความซับซ้อน

```
⚡ Quick Ask (< 10 วินาที)
   → ถามผู้เชี่ยวชาญคนเดียวแบบ chat
   → ใช้สำหรับคำถามง่ายๆ ด่วน
   → ตอบพร้อมอ้างอิงมาตราทันที

🤝 Consult (30-60 วินาที)
   → 2-3 คน วิเคราะห์และถกเถียงกัน
   → ใช้สำหรับปัญหาที่ต้องการ 2nd opinion
   → แสดง timeline การถกเถียงแบบ real-time

🏛️ Full Board Meeting (2-5 นาที)
   → ทั้งทีมประชุมเต็ม 5 phases
   → ใช้สำหรับการตัดสินใจสำคัญ
   → สรุปมติ + extract memory facts อัตโนมัติ
```

### 4. Agent Memory — จำบริษัทลูกค้าทุกรายละเอียด

ระบบจำข้อมูลข้ามเซสชัน:

```
workspace: "บริษัท ABC จำกัด"
├── vat_registered: true
├── vat_number: "0105xxxxxxxxx"
├── employee_count: 12
├── fiscal_year: "มกราคม - ธันวาคม"
├── accounting_standard: "NPAEs"
├── main_business: "นำเข้า-ส่งออกอาหารแปรรูป"
└── last_audit: "ปี 2567"

→ ทุก session ถัดไป agents จะรู้ข้อมูลนี้โดยอัตโนมัติ
→ ไม่ต้องอธิบาย context ใหม่ทุกครั้ง
```

### 5. Agent Templates — ไม่ต้องเริ่มจากศูนย์

Pre-built templates สำหรับ domains ทั่วไป:

```
📂 Thai Accounting & Tax Pack
   ├── ที่ปรึกษาภาษีมูลค่าเพิ่ม (VAT Specialist)
   ├── ผู้เชี่ยวชาญภาษีเงินได้นิติบุคคล
   ├── ผู้ตรวจสอบบัญชี (CPA)
   └── นักบัญชีอาวุโส

📂 Legal Advisory Pack
   ├── ที่ปรึกษากฎหมายแรงงาน
   ├── ที่ปรึกษาสัญญาธุรกิจ
   └── ผู้เชี่ยวชาญ BOI

📂 Business Analysis Pack
   ├── นักวิเคราะห์การเงิน
   ├── ที่ปรึกษากลยุทธ์
   └── ผู้ตรวจสอบความเสี่ยง
```

---

## 🗂️ Implementation Phases (Revised)

> ⚠️ **Note**: Next.js 16.2.3 (not 15). Breaking change: `middleware.ts` → `proxy.ts`

### Phase 1: Foundation — Database + Auth (Week 1-2) ✅ COMPLETED

**เป้าหมาย**: โปรเจคพร้อม develop + Better Auth ทำงานได้

| Task | Detail | P | Status |
|------|--------|---|--------|
| 1.1 | Init Next.js 16 + TypeScript + Tailwind 4 + App Router | P0 | ✅ |
| 1.2 | Setup Drizzle ORM + PostgreSQL connection + pooling | P0 | ✅ |
| 1.3 | ติดตั้ง Better Auth + organizations + RBAC plugins | P0 | ✅ |
| 1.4 | Generate Better Auth schema (Drizzle) — users, organizations, members, sessions | P0 | ✅ |
| 1.5 | เพิ่ม custom tables: agents, teams, sessions, memory, stats | P0 | ✅ |
| 1.6 | Setup Docker Compose (app + postgres + redis) | P0 | ✅ |
| 1.7 | สร้าง .env.example ครบทุก variable | P0 | ✅ |
| 1.8 | สร้าง seed script สำหรับ dev data (8 templates) | P1 | ✅ |

**Deliverable**: ✅ `npm run dev` ขึ้นได้, connect DB + Redis ok, 17 tables ครบ, health check ok

---

### Phase 2: Auth + Workspace (Week 2-3) ✅ COMPLETED

**เป้าหมาย**: Login/Register + สร้าง Workspace (เปลี่ยนชื่อจาก Company เป็น Workspace)

| Task | Detail | P | Status |
|------|--------|---|--------|
| 2.1 | Login/Register pages (Better Auth credentials) | P0 | ✅ |
| 2.2 | Protected route proxy (proxy.ts — Next.js 16) | P0 | ✅ |
| 2.3 | Workspace CRUD API (create, read, update, settings) | P0 | ✅ |
| 2.4 | Workspace switcher component ใน sidebar | P0 | ✅ |
| 2.5 | Active workspace context (provider + guard) | P0 | ✅ |
| 2.6 | RBAC permission helpers (hasPermission, requireAuth, requirePermission) | P0 | ✅ |
| 2.7 | Auto-create default workspace on first login (WorkspaceGuard) | P1 | ✅ |
| 2.8 | Workspace invitation by email | P2 | ✅ |

**Deliverable**: ✅ User สมัคร login ได้ + สร้าง workspace สลับได้ + sidebar + dashboard layout

---

### Phase 3: Agent & Team Builder (Week 3-5) ✅ COMPLETED

**เป้าหมาย**: สร้าง/จัดการ agents และ teams ได้ครบ

| Task | Detail | P | Status |
|------|--------|---|--------|
| 3.1 | Agent CRUD API + UI (สร้าง/แก้ไข/ลบ) | P0 | ✅ |
| 3.2 | Agent form: soul, role, provider, model, encrypted API key | P0 | ✅ |
| 3.3 | Knowledge Base: upload PDF/Excel/Word + store + display | P0 | ✅ |
| 3.4 | Agent Templates: pre-built Thai accounting/legal/finance agents | P0 | ✅ |
| 3.5 | Team CRUD API + UI | P0 | ✅ |
| 3.6 | Drag-and-drop agent → team assignment | P1 | — |
| 3.7 | Agent preview: test agent ด้วย Quick Ask ก่อน add to team | P1 | — |

**Deliverable**: ✅ สร้าง agent ได้ + upload knowledge + จัดทีมได้ + template gallery

---

### Phase 4: Mastra Meeting Engine (Week 5-8) ✅ COMPLETED

**เป้าหมาย**: ระบบประชุม AI ทำงานได้จริงทั้ง 3 modes

| Task | Detail | P | Status |
|------|--------|---|--------|
| 4.1 | ติดตั้ง Mastra + model builder + agent factory | P0 | ✅ |
| 4.2 | Meeting context builder + prompt builders | P0 | ✅ |
| 4.3 | **Quick Ask Mode**: single agent, instant streaming response | P0 | ✅ |
| 4.4 | **Consult Mode**: 2-3 agents, parallel analysis + discussion | P0 | ✅ |
| 4.5 | **Full Board Meeting**: 5-phase flow (manual orchestration) | P0 | ✅ |
| 4.6 | SSE streaming → client (real-time agent messages) | P0 | ✅ |
| 4.7 | Document upload for meeting context (PDF/Excel/Word) | P0 | ✅ |
| 4.8 | MCP integration: เชื่อม ERP/Centrix ผ่าน Mastra MCP plugin | P1 | ⏳ deferred |
| 4.9 | Clarification phase: Chairman ถามก่อนประชุม | P0 | ✅ |
| 4.10 | Memory extraction: auto-extract facts หลัง meeting จบ | P0 | ✅ |
| 4.11 | Anti-hallucination rules inject ใน every prompt | P0 | ✅ |
| 4.12 | Agent stats: track token usage ต่อ agent ต่อ workspace | P0 | ✅ |
| — | Meeting room UI page + history page | P0 | ✅ |

**Deliverable**: Meeting room ทำงานได้ทั้ง 3 modes + streaming จริง ✅

---

### Phase 5: Memory & Intelligence (Week 8-9) ✅

**เป้าหมาย**: ระบบจำข้อมูลข้ามเซสชันทำงานได้ดี

| Task | Detail | P | Status |
|------|--------|---|--------|
| 5.1 | Memory queries layer: full CRUD + search + upsert + categories | P0 | ✅ |
| 5.2 | Memory API routes: GET/POST/PATCH/DELETE + filter/search/pagination | P0 | ✅ |
| 5.3 | Memory facts UI: ดู/เพิ่ม/แก้ไข/ลบ + category filter + search | P1 | ✅ |
| 5.4 | Context window management: auto-truncate token budget 12K | P1 | ✅ |
| 5.5 | Session history search: ค้นหาใน meeting history | P2 | ✅ |
| 5.6 | Workspace profile page: ข้อมูลบริษัทที่ agent รู้ | P1 | Deferred |

**Deliverable**: Agent จำข้อมูล workspace ข้ามเซสชัน + history ค้นหาได้ ✅

---

### Phase 6: UI/UX Production (Week 9-11) ✅

**เป้าหมาย**: UI พร้อม production — สวย ใช้ง่าย ไม่ต้อง manual มาก

| Task | Detail | P | Status |
|------|--------|---|--------|
| 6.1 | Dashboard: overview stats, recent sessions, quick start | P0 | ✅ Stats API + live dashboard |
| 6.2 | Meeting room: copy button, streaming cursor, group-hover | P0 | ✅ |
| 6.3 | Agent cards: seniority stars, active badge, skeleton loading | P1 | ✅ |
| 6.4 | Responsive sidebar: mobile drawer + hamburger menu | P0 | ✅ |
| 6.5 | Loading skeletons ทุกหน้า (agents, teams, history, memory, templates) | P1 | ✅ |
| 6.6 | Empty states polish (ทุกหน้ามี icon + CTA) | P1 | ✅ |
| 6.7 | Stats page: token chart, mode distribution, top agents table | P1 | ✅ |
| 6.8 | Build verify (36 routes, 0 errors) + API test | P1 | ✅ |
| 6.9 | Dark mode | P2 | ⏳ Deferred |

**Deliverable**: UI ที่ user ใหม่เปิดมาแล้วรู้ทันทีว่าต้องทำอะไร

---

### Phase 7: Infrastructure & DevOps (Week 11-12) ✅

| Task | Detail | P | Status |
|------|--------|---|--------|
| 7.1 | Docker Compose production (env_file, logging, .dockerignore) | P0 | ✅ |
| 7.2 | GitHub Actions CI/CD (build → SCP → deploy → health check) | P0 | ✅ |
| 7.3 | Health check endpoint (version, uptime, timestamp, DB+Redis) | P0 | ✅ |
| 7.4 | Database backup script (pg_dump cron daily, 30-day retention) | P0 | ✅ |
| 7.5 | Cloudflare Tunnel config template | P0 | ✅ |
| 7.6 | Structured logging (Pino + pino-pretty dev) | P1 | ✅ |
| 7.7 | Security headers (CSP, X-Frame-Options, Permissions-Policy, etc.) | P0 | ✅ |

---

### Phase 8: Security & Compliance (Week 12) ✅

| Task | Detail | P | Status |
|------|--------|---|--------|
| 8.1 | Input validation (Zod) ทุก API endpoint + safe body parsing | P0 | ✅ |
| 8.2 | Rate limiting per user (Redis sliding window) — auth/mutation/read/meeting | P0 | ✅ |
| 8.3 | API key encryption AES-256-GCM | P0 | ✅ (Phase 3) |
| 8.4 | Security headers (CSP, X-Frame-Options, Permissions-Policy) | P0 | ✅ (Phase 7) |
| 8.5 | PDPA compliance: data export + right to delete (workspace-level) | P1 | ✅ |
| 8.6 | Audit logs: who did what when (agents, teams, meetings, memory) | P1 | ✅ |
| 8.7 | Dependency vulnerability scan (npm audit in CI/CD) | P1 | ✅ |

---

### Phase 9: Migration & Launch (Week 12) ✅

| Task | Detail | P | Status |
|------|--------|---|--------|
| 9.1 | Migrate BossBoard data → PostgreSQL (scripts/migrate-from-bossboard.ts) | P0 | ✅ |
| 9.2 | Re-encrypt API keys CBC → GCM (built into migration script) | P0 | ✅ |
| 9.3 | Data integrity verification (scripts/verify-migration.ts) | P0 | ✅ |
| 9.4 | Smoke test: 7 APIs + Quick Ask SSE stream with migrated agent | P0 | ✅ |

**Migration Results:**
- 5 agents, 1 team, 6 memory facts, 7 meetings (39 messages), 9 stat entries migrated
- All 5 API keys re-encrypted CBC→GCM, verified decryptable
- Quick Ask streaming confirmed working with migrated นักบัญชีอาวุโส agent

---

### Phase 10: Future Roadmap (TBD)

| Feature | Detail |
|---------|--------|
| **LINE Integration** | Bot สำหรับ Quick Ask ผ่าน LINE (คนไทยใช้ LINE) |
| **Agent Marketplace** | แชร์ agent templates ระหว่าง workspace |
| **Subscription Billing** | Free/Pro/Enterprise tiers |
| **Super Admin Panel** | จัดการ users, workspaces, monitoring |
| **API Access** | REST API สำหรับ integrate กับ app อื่น |
| **Webhook** | Trigger meeting อัตโนมัติจาก event ภายนอก |

---

## 🔧 Tech Stack (Final)

| Layer | Technology | เหตุผล |
|-------|-----------|--------|
| **Framework** | Next.js 15 (App Router) | SSR + API routes + RSC |
| **Language** | TypeScript 5 strict | Type safety ทุกชั้น |
| **UI** | React 19 + Tailwind 4 | เดิม ดีอยู่แล้ว |
| **Icons** | Lucide React | เดิม |
| **Database** | PostgreSQL 16 | Relational, JSONB, อยู่บน server แล้ว |
| **ORM** | Drizzle ORM | Type-safe, lightweight |
| **Auth** | **Better Auth** | Organizations + RBAC built-in |
| **AI Engine** | **Mastra AI** | AgentNetwork, Memory, MCP, Streaming |
| **LLM** | ผ่าน Mastra (Vercel AI SDK) | 100+ providers, switch ได้ง่าย |
| **Cache** | Redis 7 (ioredis) | Rate limit, session cache |
| **Doc Parsing** | pdf-parse, mammoth, xlsx | เดิม (หรือ markitdown ถ้าต้องการ accuracy สูง) |
| **Validation** | Zod | Input validation ทุก API |
| **Logging** | Pino | Structured logging |
| **Encryption** | AES-256-GCM (Node crypto) | API key encryption |
| **Container** | Docker + Docker Compose | On-premise deploy |
| **CI/CD** | GitHub Actions | Auto build + deploy |
| **CDN/Tunnel** | Cloudflare | HTTPS + อยู่บน server แล้ว |

---

## ⚠️ Critical Rules (ไม่เปลี่ยนแปลง)

### Security
- **ALWAYS** filter by `workspaceId` ทุก business query — multi-tenant safety
- **NEVER** expose raw DB errors to client
- API keys เก็บ encrypted AES-256-GCM เท่านั้น
- Hash password ด้วย bcryptjs cost 12
- Rate limit: 10/min auth, 30/min mutations, 200/min reads

### Architecture
- Server Components by default, `"use client"` เฉพาะเมื่อจำเป็น
- DB access ผ่าน `lib/db/queries/*.ts` เท่านั้น — ห้าม query ตรงใน route handler
- Zod validate ทุก API input
- Transaction สำหรับ multi-table writes
- Soft deletes ทุกตาราง (`deleted_at`)

### Meeting Engine (Mastra)
- Quick Ask: 1 agent, timeout 30s
- Consult: 2-3 agents, timeout 90s
- Full Board: ทีมทั้งหมด, timeout 300s
- Anti-hallucination inject ทุก prompt
- SSE stream ทันที — ห้าม buffer รอ complete

### Terminology (ใช้ให้สม่ำเสมอ)
- **Workspace** (ไม่ใช่ Company) — พื้นที่ทำงานของ user แต่ละราย
- **Agent** — ผู้เชี่ยวชาญ AI คนหนึ่ง
- **Team** — กลุ่ม agents
- **Meeting** — session การประชุม (3 modes)
- **Memory** — ข้อมูลที่ agent จำข้ามเซสชัน

---

## 🖥️ Production Server

- **IP**: 192.168.2.109 (ssh bosscatdog@...)
- **Specs**: Intel i3-8100, 7.6GB RAM, no GPU, 25GB free disk, Ubuntu 24.04
- **Services อยู่แล้ว**: PostgreSQL (5432, 5434), Redis (6380), Cloudflare tunnels
- **Port**: 3004 (BossBoard=3003, OpenClaw=3000, Centrix=3002)
- **Memory budget**: App 512MB + Postgres 256MB + Redis 128MB ≈ 900MB

---

## 🗓️ Timeline

| Phase | สัปดาห์ | งานหลัก |
|-------|---------|---------|
| 1 | 1-2 | Foundation + DB + Better Auth |
| 2 | 2-3 | Auth UI + Workspace management |
| 3 | 3-5 | Agent & Team Builder + Templates |
| 4 | 5-8 | Mastra Meeting Engine (3 modes) |
| 5 | 8-9 | Memory & Intelligence |
| 6 | 9-11 | UI/UX Production |
| 7 | 11-12 | Infrastructure + DevOps |
| 8 | 12 | Security + Compliance |
| 9 | 12 | Migration + Launch |

**Total: ~12 สัปดาห์ สู่ production-ready MVP**
