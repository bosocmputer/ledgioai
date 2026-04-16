# LEDGIO AI

> สร้าง AI Expert Team ของคุณเอง — ให้พวกเขาประชุม ถกเถียง หาคำตอบร่วมกัน

แพลตฟอร์มสร้างทีมที่ปรึกษา AI หลายด้าน แล้วให้พวกเขา **ประชุมร่วมกัน** เหมือนจ้างทีมที่ปรึกษาจริง แต่ราคาถูกกว่ามาก

## Features

### Core

- **Agent Builder** — สร้างผู้เชี่ยวชาญ AI พร้อม Soul (system prompt), Knowledge Base, Web Search, MCP
- **Team Builder** — จัดทีม Agent ตามโดเมน
- **Meeting Room** — 3 โหมดประชุม:
  - ⚡ **Quick Ask** — 1 agent ตอบทันที (< 10 วินาที)
  - 🤝 **Consult** — 2-3 agents ถกเถียงกัน (30-60 วินาที)
  - 🏛️ **Full Board** — ทีมเต็ม 5-phase meeting (2-5 นาที)
- **Agent Memory** — จำข้อมูลข้ามเซสชัน
- **6 LLM Providers** — Anthropic, OpenAI, Gemini, OpenRouter, Ollama, Custom
- **Document Upload** — PDF, Excel, Word, CSV
- **Anti-Hallucination** — กฎป้องกัน hallucination ฝังในทุก prompt

### Extended (13 Features)

- 🎤 **Voice Input** — พูดภาษาไทยแปลงเป็นข้อความ (Web Speech API)
- 📄 **Auto-Report** — สร้างรายงาน HTML พร้อมดาวน์โหลด/พิมพ์
- 📲 **LINE Notify / Webhook** — แจ้งเตือนเมื่อประชุมเสร็จ
- 🏪 **Agent Templates** — เทมเพลตผู้เชี่ยวชาญสำเร็จรูป
- 📱 **PWA** — ติดตั้งเป็น App บนมือถือ + Offline Cache
- ⏰ **Scheduled Meeting** — ตั้งเวลาประชุมล่วงหน้า / Recurring
- 🔗 **Share Meeting** — สร้างลิงก์แชร์ผลประชุม
- ⭐ **Agent Rating** — ให้คะแนน 1-5 ดาวหลังประชุม
- 📊 **Insight Dashboard** — กราฟประชุมรายวัน, Tokens, คะแนนเฉลี่ย
- 🏷️ **Tags** — ติด tag จัดหมวดหมู่การประชุม
- 🤖 **Auto-Soul Generator** — สร้าง Soul อัตโนมัติจากชื่อ+บทบาท
- 📋 **Meeting Templates** — คำถามสำเร็จรูปใช้ซ้ำได้
- 🌐 **Multi-language** — เลือกภาษาตอบกลับ: TH / EN / ZH / JA

### Compliance & Security

- 🔐 **AES-256-GCM Encryption** — API keys เข้ารหัสทุกตัว
- 📝 **Audit Logs** — บันทึกทุกการกระทำ
- 🏢 **Multi-Tenant** — Workspace isolation, ทุก query filter `workspaceId`
- 🛡️ **RBAC** — Owner / Admin / Member / Viewer
- 📤 **PDPA Compliance** — Data export + Right to delete

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Runtime | React 19, TypeScript 5 |
| Auth | Better Auth + Organization + RBAC |
| AI Engine | Mastra AI (Agent, AgentNetwork, Memory) |
| Database | PostgreSQL 16 + Drizzle ORM |
| Cache | Redis 7 (ioredis) |
| Validation | Zod |
| Styling | Tailwind CSS 4 (Dark Mode) |
| Logging | Pino (Structured JSON) |
| Deploy | Docker + Docker Compose |

## Project Structure

```
app/
  (auth)/login, register           ← Auth pages
  (dashboard)/                     ← Protected pages
    page.tsx                       ← Dashboard
    meeting/                       ← Meeting room (core feature)
    agents/                        ← Agent CRUD + builder
    teams/                         ← Team management
    history/                       ← Meeting history + detail
    insights/                      ← Analytics dashboard
    templates/                     ← Agent templates marketplace
    memory/                        ← Memory facts
    workspaces/                    ← Workspace management
    settings/                      ← Workspace settings
  api/
    auth/[...all]/                 ← Better Auth handler
    agents/                        ← Agent CRUD + knowledge + soul
    teams/                         ← Team CRUD
    meetings/stream/               ← SSE meeting stream (core)
    meetings/[id]/rate|report|share|tags
    memory/                        ← Memory CRUD
    stats/insights/                ← Analytics API
    notify/line|webhook            ← Notifications
    health/                        ← Health check
  share/[token]/                   ← Public shared meeting page

lib/
  auth/                            ← Better Auth config + RBAC
  db/schema/                       ← Drizzle schemas (20 tables)
  db/queries/                      ← All DB access functions
  meeting/engine.ts                ← Mastra orchestration
  meeting/modes/                   ← quick-ask, consult, full-board
  meeting/prompts.ts               ← System prompts + anti-hallucination
  mastra/                          ← Agent factory + model builder
  encryption.ts                    ← AES-256-GCM
  redis.ts                         ← Redis client
  rate-limit.ts                    ← Rate limiting

components/
  layout/sidebar, user-menu        ← App shell
  meeting/voice-input              ← Voice input component
  agents/drag-drop, preview-modal  ← Agent UI components
  pwa/sw-register                  ← Service worker
```

## Getting Started

### Prerequisites

- Node.js 22+
- PostgreSQL 16
- Redis 7

### Installation

```bash
git clone https://github.com/bosocmputer/ledgioai.git
cd ledgioai
npm ci
```

### Environment Variables

สร้างไฟล์ `.env.local`:

```env
# Database
DATABASE_URL=postgresql://ledgioai:password@localhost:5432/ledgioai

# Redis
REDIS_URL=redis://localhost:6379

# Auth
AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000

# Encryption (64 hex chars)
ENCRYPTION_KEY=<node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Logging (optional)
LOG_LEVEL=info
```

### Database Setup

```bash
npm run db:push       # Push schema to database
npm run db:seed       # Seed agent templates
```

### Development

```bash
npm run dev           # Start dev server (Turbopack) → http://localhost:3000
```

### Build

```bash
npm run build         # Production build
npm start             # Start production server
```

## Database Commands

```bash
npm run db:generate   # Generate Drizzle migrations
npm run db:push       # Push schema directly to DB
npm run db:migrate    # Run migrations
npm run db:studio     # Open Drizzle Studio (GUI)
npm run db:seed       # Seed agent templates
```

## Deployment (Docker)

### Quick Deploy

```bash
./scripts/deploy.sh
```

### Manual Deploy

```bash
# Build image
docker build -t ledgioai:latest .

# Run with docker compose
docker compose up -d
```

### Production

- **Host:** `192.168.2.109`
- **Port:** `3004`
- **Container:** `ledgioai` (512MB RAM limit)
- **Health Check:** `GET /api/health`

```bash
curl http://192.168.2.109:3004/api/health
# {"status":"healthy","checks":{"database":"ok","redis":"ok"}}
```

## API Routes (51 total)

| Category | Endpoints | Description |
|----------|-----------|-------------|
| Auth | `/api/auth/[...all]` | Better Auth handler |
| Agents | `/api/agents`, `/api/agents/[id]`, `/api/agents/generate-soul` | Agent CRUD + Soul generator |
| Knowledge | `/api/agents/[id]/knowledge`, `/upload` | Document upload + management |
| Teams | `/api/teams`, `/api/teams/[id]` | Team CRUD |
| Meetings | `/api/meetings`, `/api/meetings/stream` | Meeting CRUD + SSE streaming |
| Meeting Actions | `/api/meetings/[id]/rate\|report\|share\|tags` | Rate, report, share, tags |
| Memory | `/api/memory`, `/api/memory/[id]` | Memory facts CRUD |
| Templates | `/api/agent-templates`, `/api/meeting-templates` | Agent + meeting templates |
| Stats | `/api/stats`, `/api/stats/insights` | Usage + insight analytics |
| Notify | `/api/notify/line`, `/api/notify/webhook` | LINE Notify + Webhook |
| Schedule | `/api/scheduled-meetings` | Scheduled meetings CRUD |
| Workspaces | `/api/workspaces`, `/[id]/invite`, `/[id]/members` | Workspace management |
| Compliance | `/api/audit`, `/api/compliance/export` | Audit logs + PDPA export |
| Health | `/api/health` | Health check (DB + Redis) |

## Documentation

ดูเอกสารเพิ่มเติมใน `docs/`:

| Document | เนื้อหา |
|----------|--------|
| `MASTER_PLAN.md` | Vision, phases, tech decisions |
| `DATABASE_SCHEMA.md` | Schema ทุกตาราง (20 tables) |
| `AUTH_SYSTEM.md` | Better Auth + RBAC |
| `MULTI_TENANT.md` | Workspace isolation |
| `AI_INTEGRATION.md` | Mastra engine, 3 modes, prompts |
| `PROJECT_STRUCTURE.md` | File structure, conventions |
| `API_SPEC.md` | Endpoint spec ทุกตัว |
| `INFRASTRUCTURE.md` | Docker, deploy, monitoring |

## License

Private — Internal use only.
