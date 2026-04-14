# LEDGIO AI — Project Structure

> ไฟล์และโฟลเดอร์ทั้งหมดที่ต้องสร้าง, conventions, coding standards

## 📁 Complete File Structure

```
ledgioai/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD pipeline
│
├── app/                            # Next.js App Router
│   ├── globals.css                 # Tailwind 4 global styles
│   ├── layout.tsx                  # Root layout (providers wrapper)
│   ├── providers.tsx               # Client providers (session, theme, company)
│   ├── icon.tsx                    # App icon
│   │
│   ├── (auth)/                     # Auth pages (no sidebar)
│   │   ├── layout.tsx              # Minimal auth layout
│   │   ├── login/
│   │   │   └── page.tsx            # Login form
│   │   └── register/
│   │       └── page.tsx            # Register form
│   │
│   ├── (dashboard)/                # Authenticated pages (with sidebar)
│   │   ├── layout.tsx              # Dashboard layout (sidebar + main)
│   │   ├── page.tsx                # Dashboard home / overview
│   │   ├── meeting/
│   │   │   └── page.tsx            # Meeting room (main feature)
│   │   ├── agents/
│   │   │   └── page.tsx            # Agent CRUD
│   │   ├── teams/
│   │   │   └── page.tsx            # Team management
│   │   ├── history/
│   │   │   ├── page.tsx            # Session history list
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Session detail view
│   │   ├── stats/
│   │   │   └── page.tsx            # Statistics dashboard
│   │   ├── memory/
│   │   │   └── page.tsx            # Memory facts management
│   │   ├── companies/
│   │   │   ├── page.tsx            # Company list
│   │   │   └── new/
│   │   │       └── page.tsx        # Create new company
│   │   └── settings/
│   │       └── page.tsx            # Company settings
│   │
│   └── api/                        # Route Handlers
│       ├── auth/
│       │   ├── [...nextauth]/
│       │   │   └── route.ts        # NextAuth handler
│       │   └── register/
│       │       └── route.ts        # User registration
│       ├── companies/
│       │   ├── route.ts            # GET list, POST create
│       │   ├── switch/
│       │   │   └── route.ts        # POST switch active company
│       │   └── [id]/
│       │       ├── route.ts        # GET, PUT, DELETE company
│       │       ├── invite/
│       │       │   └── route.ts    # POST invite member
│       │       └── members/
│       │           └── route.ts    # GET members list
│       ├── agents/
│       │   ├── route.ts            # GET list, POST create
│       │   └── [id]/
│       │       ├── route.ts        # GET, PUT, DELETE agent
│       │       └── knowledge/
│       │           ├── route.ts    # GET list knowledge
│       │           ├── upload/
│       │           │   └── route.ts # POST upload file
│       │           └── [knowledgeId]/
│       │               └── route.ts # DELETE knowledge
│       ├── teams/
│       │   ├── route.ts            # GET list, POST create
│       │   └── [id]/
│       │       └── route.ts        # GET, PUT, DELETE team
│       ├── meetings/
│       │   ├── route.ts            # GET list sessions
│       │   ├── stream/
│       │   │   └── route.ts        # POST SSE meeting stream
│       │   └── [id]/
│       │       └── route.ts        # GET session detail
│       ├── documents/
│       │   └── upload/
│       │       └── route.ts        # POST upload for meeting context
│       ├── memory/
│       │   ├── route.ts            # GET list, PUT upsert
│       │   └── [id]/
│       │       └── route.ts        # DELETE memory fact
│       ├── stats/
│       │   └── route.ts            # GET agent statistics
│       ├── settings/
│       │   └── route.ts            # GET, PUT company settings
│       └── health/
│           └── route.ts            # GET health check
│
├── components/                     # Shared UI Components
│   ├── ui/                         # Base UI components
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown.tsx
│   │   ├── select.tsx
│   │   ├── textarea.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── avatar.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   └── spinner.tsx
│   ├── layout/
│   │   ├── sidebar.tsx             # Main sidebar navigation
│   │   ├── company-switcher.tsx    # Company dropdown switcher
│   │   ├── user-menu.tsx           # User dropdown (profile, logout)
│   │   └── header.tsx              # Page header
│   ├── meeting/
│   │   ├── meeting-room.tsx        # Main meeting room container
│   │   ├── message-bubble.tsx      # Agent message display
│   │   ├── meeting-controls.tsx    # Start/stop meeting controls
│   │   ├── clarification-form.tsx  # Clarification questions UI
│   │   ├── file-upload.tsx         # Document upload area
│   │   └── web-sources.tsx         # Web search sources display
│   ├── agents/
│   │   ├── agent-card.tsx          # Agent display card
│   │   ├── agent-form.tsx          # Create/edit agent form
│   │   └── knowledge-upload.tsx    # Knowledge file upload
│   ├── teams/
│   │   ├── team-card.tsx           # Team display card
│   │   └── team-form.tsx           # Create/edit team form
│   └── providers/
│       ├── session-provider.tsx    # NextAuth SessionProvider
│       ├── company-provider.tsx    # Active company context
│       └── theme-provider.tsx      # Dark/light theme
│
├── lib/                            # Shared Libraries
│   ├── db/                         # Database Layer
│   │   ├── index.ts                # Drizzle client export
│   │   ├── schema/                 # Drizzle schema definitions
│   │   │   ├── index.ts            # Re-export all schemas
│   │   │   ├── users.ts
│   │   │   ├── accounts.ts
│   │   │   ├── sessions.ts
│   │   │   ├── companies.ts
│   │   │   ├── user-companies.ts
│   │   │   ├── agents.ts
│   │   │   ├── agent-knowledge.ts
│   │   │   ├── teams.ts
│   │   │   ├── team-agents.ts
│   │   │   ├── research-sessions.ts
│   │   │   ├── research-messages.ts
│   │   │   ├── memory-facts.ts
│   │   │   ├── agent-stats.ts
│   │   │   ├── company-settings.ts
│   │   │   └── audit-logs.ts
│   │   └── queries/                # Reusable query functions
│   │       ├── agents.ts           # Agent CRUD queries
│   │       ├── teams.ts            # Team CRUD queries
│   │       ├── sessions.ts         # Session queries
│   │       ├── memory.ts           # Memory queries
│   │       ├── stats.ts            # Stats queries
│   │       └── settings.ts         # Settings queries
│   │
│   ├── auth/                       # Auth Utilities
│   │   ├── permissions.ts          # RBAC permission checks
│   │   └── company-context.ts      # Active company helper
│   │
│   ├── llm/                        # LLM Integration
│   │   ├── call-llm.ts             # Multi-provider LLM caller
│   │   ├── providers/              # Provider-specific implementations
│   │   │   ├── anthropic.ts
│   │   │   ├── openrouter.ts
│   │   │   ├── openai.ts
│   │   │   ├── gemini.ts
│   │   │   └── ollama.ts
│   │   └── streaming.ts            # SSE streaming utilities
│   │
│   ├── meeting/                    # Meeting Flow Engine
│   │   ├── engine.ts               # Main orchestrator
│   │   ├── phases/                 # Phase implementations
│   │   │   ├── clarification.ts
│   │   │   ├── analysis.ts
│   │   │   ├── findings.ts
│   │   │   ├── discussion.ts
│   │   │   └── synthesis.ts
│   │   ├── chairman.ts             # Chairman detection + seniority
│   │   ├── voice.ts                # Agent speaking styles
│   │   └── prompts.ts              # System prompts + anti-hallucination
│   │
│   ├── integrations/               # External Integrations
│   │   ├── web-search.ts           # Serper + SerpApi
│   │   ├── mcp-client.ts           # MCP Protocol client
│   │   └── supermemory.ts          # Supermemory API (Phase 5)
│   │
│   ├── documents/                  # Document Processing
│   │   ├── parser.ts               # Main parser (dispatch by type)
│   │   ├── pdf.ts                  # PDF parsing
│   │   ├── excel.ts                # Excel parsing
│   │   ├── word.ts                 # Word parsing
│   │   └── text.ts                 # CSV/JSON/Text parsing
│   │
│   ├── domain-knowledge.ts         # Built-in Thai tax/accounting rules
│   ├── encryption.ts               # AES-256-GCM encrypt/decrypt
│   ├── rate-limit.ts               # Redis-backed rate limiting
│   ├── redis.ts                    # Redis client
│   ├── logger.ts                   # Pino logger
│   ├── validations/                # Zod schemas
│   │   ├── auth.ts
│   │   ├── agent.ts
│   │   ├── team.ts
│   │   ├── meeting.ts
│   │   ├── company.ts
│   │   └── settings.ts
│   └── utils.ts                    # Shared utilities (cn, formatDate, etc.)
│
├── drizzle/                        # Database Migrations
│   └── *.sql                       # Generated by drizzle-kit
│
├── scripts/                        # Scripts
│   ├── deploy.sh                   # Manual deploy script
│   ├── backup-db.sh                # Database backup
│   ├── migrate-from-bossboard.ts   # BossBoard data migration
│   ├── verify-migration.ts         # Migration verification
│   └── seed.ts                     # Development seed data
│
├── public/                         # Static files
│   └── assets/
│       └── platform-logos/
│
├── types/                          # TypeScript type declarations
│   └── next-auth.d.ts              # NextAuth session types
│
├── docs/                           # Documentation (this folder)
│   ├── MASTER_PLAN.md
│   ├── DATABASE_SCHEMA.md
│   ├── AUTH_SYSTEM.md
│   ├── MULTI_TENANT.md
│   ├── AI_INTEGRATION.md
│   ├── API_SPEC.md
│   ├── MIGRATION.md
│   ├── INFRASTRUCTURE.md
│   └── PROJECT_STRUCTURE.md
│
├── .env.example                    # Environment variable template
├── .gitignore
├── auth.ts                         # NextAuth configuration (root)
├── middleware.ts                    # Auth middleware (root)
├── docker-compose.yml              # Docker Compose config
├── Dockerfile                      # Multi-stage Docker build
├── drizzle.config.ts               # Drizzle ORM config
├── next.config.ts                  # Next.js config
├── package.json
├── postcss.config.js
├── tailwind.config.ts              # Tailwind config (if needed beyond CSS)
├── tsconfig.json
└── README.md
```

## 🎨 Coding Standards

### TypeScript
- **Strict mode** enabled
- Use `interface` for shapes, `type` for unions/intersections
- No `any` — use `unknown` with type narrowing
- Named exports (not default) for utilities and components

### React Components
- **Function components** only (no class components)
- **Server Components** by default (App Router)
- `"use client"` only when needed (event handlers, hooks, browser APIs)
- Props interface: `interface Props { ... }` above component

### File Naming
- **Files**: kebab-case (`agent-card.tsx`, `call-llm.ts`)
- **Components**: PascalCase export (`export function AgentCard()`)
- **API Routes**: Next.js conventions (`route.ts` only)
- **DB Schema**: kebab-case files, camelCase column names in Drizzle

### Imports
- Absolute imports with `@/` alias (→ project root)
- Group: 1) External packages, 2) `@/lib/*`, 3) `@/components/*`, 4) Relative

### Error Handling
- API routes: try-catch → JSON error response with status code
- Use Zod for input validation (`.safeParse()`)
- Database errors: catch and return generic message (don't leak)
- LLM errors: retry once on 429, throw on other errors

### Database
- All queries go through `lib/db/queries/*.ts`
- Always filter by `companyId` for business data
- Use transactions for multi-table writes
- Return types from queries (not `SELECT *`)

## 📦 Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "next-auth": "5.0.0-beta.25",
    "@auth/drizzle-adapter": "^1.0.0",
    "drizzle-orm": "^0.35.0",
    "postgres": "^3.4.0",
    "ioredis": "^5.4.0",
    "bcryptjs": "^2.4.3",
    "zod": "^3.23.0",
    "pino": "^9.0.0",
    "lucide-react": "^1.8.0",
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

## 🔄 Config Files

### next.config.ts

```typescript
import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",         // For Docker deployment
  serverExternalPackages: [     // Don't bundle these
    "pino",
    "pino-pretty",
    "pdf-parse",
  ],
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
};

export default config;
```

### drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```
