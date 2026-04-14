# LEDGIO AI — Production System

> ระบบ AI Board Meeting Room สำหรับสำนักงานบัญชีไทย — Multi-Tenant SaaS Platform

## 🎯 Overview

LEDGIO AI คือ platform ที่ให้บริการ "ห้องประชุม AI" สำหรับให้คำปรึกษาด้านบัญชีและภาษีไทย โดยมี AI Agents หลายตัวทำหน้าที่เป็นผู้เชี่ยวชาญเฉพาะด้าน (CPA, นักบัญชีอาวุโส, ที่ปรึกษาภาษี, นักวิเคราะห์งบ, ผู้ตรวจสอบภายใน) ประชุมร่วมกันเพื่อตอบคำถามแบบ 5-Phase Meeting Flow

### Business Model
- ขายเป็น **แพ็คเกจ SaaS** ให้เจ้าของธุรกิจที่มีหลายบริษัท
- รองรับ **Multi-Tenant** — ผู้ใช้แต่ละคนสร้างได้หลายบริษัท, แต่ละบริษัทมี agent/team/session/memory แยกอิสระ
- **Self-hosted** option สำหรับ on-premise deployment

### Core Features
1. **Multi-Agent AI Meeting** — 5-Phase: Clarification → Parallel Analysis → Findings → Discussion → Synthesis
2. **Multi-Company Management** — สร้าง/สลับบริษัทได้, ข้อมูลแยก scope ตาม company
3. **Knowledge Base** — Upload เอกสาร (PDF/Excel/Word/CSV/JSON) เป็น knowledge per agent
4. **Cross-Session Memory** — จำข้อมูลบริษัทข้ามเซสชัน (VAT status, ประเภทกิจการ ฯลฯ)
5. **MCP Integration** — เชื่อมต่อระบบ ERP/บัญชีผ่าน MCP Protocol
6. **Web Search** — ค้นหาข้อมูลล่าสุดจาก กรมสรรพากร, สภาวิชาชีพ ฯลฯ
7. **Agent Statistics** — Dashboard แสดง token usage, session count ต่อ agent
8. **Domain Knowledge** — Built-in ความรู้ภาษี/บัญชี/แรงงานไทย

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 15)                  │
│  React 19 + Tailwind 4 + TypeScript + App Router         │
├──────────────────────────────────────────────────────────┤
│                    API Layer (Route Handlers)             │
│  REST + SSE Streaming                                    │
├──────────────┬──────────────┬────────────────────────────┤
│  Auth        │  Multi-Tenant│  AI Engine                 │
│  NextAuth v5 │  Company     │  Multi-Provider LLM        │
│  + RBAC      │  Scoping     │  (Anthropic/OpenAI/Gemini/ │
│              │              │   OpenRouter/Ollama/Custom) │
├──────────────┴──────────────┴────────────────────────────┤
│                    Data Layer                             │
│  PostgreSQL + Drizzle ORM                                │
├──────────────┬──────────────┬────────────────────────────┤
│  Redis       │  Supermemory │  BullMQ                    │
│  (Cache +    │  (Vector     │  (Background Jobs)         │
│   Sessions)  │   Memory)    │                            │
├──────────────┴──────────────┴────────────────────────────┤
│                    Infrastructure                        │
│  Docker Compose + Cloudflare Tunnel + GitHub Actions     │
└──────────────────────────────────────────────────────────┘
```

## 📋 Documentation

| Document | Description |
|----------|-------------|
| [docs/MASTER_PLAN.md](docs/MASTER_PLAN.md) | Master implementation plan — phase ทั้งหมด, timeline, priority |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | PostgreSQL schema design ทุกตาราง, relations, indexes |
| [docs/AUTH_SYSTEM.md](docs/AUTH_SYSTEM.md) | Authentication & authorization — NextAuth v5, RBAC, API keys |
| [docs/MULTI_TENANT.md](docs/MULTI_TENANT.md) | Multi-company/multi-tenant architecture |
| [docs/AI_INTEGRATION.md](docs/AI_INTEGRATION.md) | AI/LLM integration — Supermemory, OmniRoute, meeting flow |
| [docs/API_SPEC.md](docs/API_SPEC.md) | API specification — ทุก endpoint, request/response format |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Migration guide จาก BossBoard demo → LEDGIO AI production |
| [docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) | Infrastructure, deployment, Docker, monitoring |
| [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) | Project file structure, conventions, coding standards |

## 🚀 Quick Start (After Implementation)

```bash
# Clone
git clone https://github.com/bosocmputer/ledgioai.git
cd ledgioai

# Setup environment
cp .env.example .env
# Edit .env with your credentials

# Start with Docker Compose
docker compose up -d

# Or development mode
npm install
npm run db:push
npm run dev
```

## 🔑 Required API Keys / Services

| Service | Purpose | Required? | Free Tier |
|---------|---------|-----------|-----------|
| PostgreSQL | Database | ✅ Yes | Self-hosted |
| Redis | Cache + Sessions | ✅ Yes | Self-hosted |
| Anthropic / OpenRouter | LLM Provider | ✅ At least 1 | OpenRouter has free models |
| Serper.dev | Web Search | Optional | 2,500 free queries |
| Supermemory | Vector Memory | Optional | 1M tokens/month free |

## 📊 Production Server Specs (Current)

| Spec | Value |
|------|-------|
| CPU | Intel i3-8100 (4 cores, 3.60GHz) |
| RAM | 7.6 GB (~5 GB available) |
| Disk | 109 GB (25 GB free) |
| GPU | None |
| OS | Ubuntu 24.04 LTS |
| Docker | 29.3.0 + Compose 5.1.1 |
| Existing | PostgreSQL (5432, 5434), Redis (6380), Cloudflare Tunnels ×4 |

## 🔗 Origin Project

This is a production rebuild of [BossBoard](https://github.com/bosocmputer/BossBoard) demo prototype.

---

**License**: MIT
