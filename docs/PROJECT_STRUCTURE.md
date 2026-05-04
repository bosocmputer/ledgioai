# LEDGIO AI — Project Structure

> Current file structure and coding conventions. Updated May 2026 from the local repository.

## Framework Notes

- Next.js version: `16.2.3`
- React version: `19.2.4`
- Uses App Router.
- Uses `proxy.ts` for route protection; do not add old-style `middleware.ts`.
- Read `node_modules/next/dist/docs/` before changing Next.js routing/build behavior because this Next version has breaking changes.

## Top-Level Files

```txt
ledgioai/
├── app/                    Next.js App Router pages and route handlers
├── components/             UI, layout, providers, PWA registration
├── docs/                   Product, architecture, infra, API documentation
├── drizzle/                Generated Drizzle migration artifacts
├── lib/                    Auth, DB, meeting engine, Mastra, utilities
├── public/                 Static assets, manifest, service worker
├── scripts/                Deploy, seed, migration helper scripts
├── types/                  Shared ambient types
├── AGENTS.md               Local agent instructions
├── BACKLOG.md              Launch/product backlog
├── Dockerfile              Production image build
├── docker-compose.yml      App service compose file
├── drizzle.config.ts       Drizzle config
├── next.config.ts          Next + Sentry + security headers
├── package.json            Dependencies and scripts
├── proxy.ts                Next 16 route protection
└── tsconfig.json
```

## App Routes

```txt
app/
├── (auth)/
│   ├── layout.tsx
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── agents/page.tsx
│   ├── agents/new/page.tsx
│   ├── agents/[id]/page.tsx
│   ├── history/page.tsx
│   ├── history/[id]/page.tsx
│   ├── insights/page.tsx
│   ├── meeting/page.tsx
│   ├── memory/page.tsx
│   ├── settings/page.tsx
│   ├── stats/page.tsx
│   ├── teams/page.tsx
│   ├── teams/new/page.tsx
│   ├── teams/[id]/page.tsx
│   ├── templates/page.tsx
│   └── workspaces/page.tsx
├── api/
│   ├── auth/[...all]/route.ts
│   ├── agents/**/route.ts
│   ├── agent-templates/route.ts
│   ├── audit/route.ts
│   ├── compliance/export/route.ts
│   ├── health/route.ts
│   ├── meetings/**/route.ts
│   ├── meeting-templates/route.ts
│   ├── memory/**/route.ts
│   ├── notify/**/route.ts
│   ├── scheduled-meetings/route.ts
│   ├── stats/**/route.ts
│   ├── teams/**/route.ts
│   └── workspaces/**/route.ts
├── share/[token]/page.tsx
├── globals.css
├── layout.tsx
└── providers.tsx
```

## Components

Current component files:

```txt
components/
├── agents/
│   ├── agent-preview-modal.tsx
│   └── drag-drop-agent-picker.tsx
├── layout/
│   ├── sidebar.tsx
│   ├── user-menu.tsx
│   └── workspace-switcher.tsx
├── meeting/
│   └── voice-input.tsx
├── providers/
│   ├── theme-provider.tsx
│   ├── workspace-guard.tsx
│   └── workspace-provider.tsx
├── pwa/
│   └── sw-register.tsx
└── ui/
    └── page-info.tsx
```

The current UI is mostly page-local markup plus a small component set. UX/UI cleanup should probably extract shared controls only after repeated patterns are visible.

## Library Structure

```txt
lib/
├── auth/
│   ├── client.ts
│   ├── helpers.ts
│   ├── index.ts
│   └── permissions.ts
├── db/
│   ├── index.ts
│   ├── queries/
│   └── schema/
├── documents/parser.ts
├── mastra/
│   ├── agent-factory.ts
│   ├── index.ts
│   └── model-builder.ts
├── meeting/
│   ├── context.ts
│   ├── engine.ts
│   ├── memory.ts
│   ├── modes/
│   ├── prompts.ts
│   └── sse.ts
├── validations/index.ts
├── cost.ts
├── encryption.ts
├── logger.ts
├── rate-limit.ts
├── redis.ts
└── utils.ts
```

## Database Schema

Schema files live in [lib/db/schema](/Users/nontawatwongnuk/dev_bos/ledgioai/lib/db/schema):

```txt
auth.ts
agents.ts
agent-knowledge.ts
agent-stats.ts
agent-templates.ts
audit-logs.ts
meeting-messages.ts
meeting-templates.ts
meetings.ts
memory-facts.ts
scheduled-meetings.ts
team-agents.ts
teams.ts
workspace-settings.ts
index.ts
```

Auth tables are Better Auth-compatible. Business tables use `workspaceId`/`workspace_id`.

## Core Runtime Flow

Meeting flow:

```txt
Meeting page
  -> POST /api/meetings/stream
  -> requirePermission("meeting:start")
  -> rate limit + quota check
  -> load agents/team scoped by workspace
  -> createSSEStream()
  -> runMeeting()
  -> mode runner: quick_ask | consult | full_board
  -> persist meeting/messages/stats/memory
```

Auth/workspace flow:

```txt
Better Auth session
  -> organization plugin
  -> session.activeOrganizationId
  -> requireAuth()/requirePermission()
  -> query helpers receive workspaceId
```

## Coding Standards

### TypeScript

- Keep `strict` assumptions.
- Avoid `any`; narrow `unknown`.
- Prefer clear interfaces for object shapes and union types for finite modes/statuses.
- Use existing Zod validators in [lib/validations/index.ts](/Users/nontawatwongnuk/dev_bos/ledgioai/lib/validations/index.ts) for API inputs.

### API Routes

Recommended pattern:

```ts
export async function POST(request: NextRequest) {
  const ctx = await requirePermission(request, "agent:create")
  if (ctx instanceof Response) return ctx

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Request body is required" }, { status: 400 })

  const parsed = parseBody(createAgentSchema, body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const result = await createAgent({ workspaceId: ctx.workspaceId, ...parsed.data })
  return NextResponse.json({ data: result }, { status: 201 })
}
```

Rules:

- Use `requireAuth()` or `requirePermission()`.
- Use query helpers under `lib/db/queries`.
- Pass `workspaceId` into every business query.
- Apply rate limiting to mutations where appropriate.
- Log important mutations with `logAudit()`.
- Never return encrypted secrets.

### Database Queries

Business query helpers should:

- Accept `workspaceId` explicitly.
- Filter by `workspaceId`.
- Filter `deletedAt` when the table supports soft delete.
- Use transactions for multi-table writes such as team assignments.

### React

- Server Components by default.
- Add `"use client"` only for state, effects, event handlers, browser APIs, or client auth hooks.
- Keep page-local UI until a pattern repeats enough to justify extraction.
- Prefer the existing provider pattern for workspace/session state.

### File Naming

| Item | Convention |
| --- | --- |
| Files | `kebab-case.ts(x)` |
| Components | `PascalCase` exports |
| Utilities | `camelCase` exports |
| Types/interfaces | `PascalCase` |
| Drizzle enum values | `snake_case` strings |

## UX/UI Prep Notes

For upcoming UX/UI work:

- Meeting room is the core product surface and has the most workflow complexity.
- Dashboard pages currently contain lots of page-local UI, so shared components should be extracted deliberately.
- `components/ui/page-info.tsx` is the only current base UI file; do not assume a full shadcn component library exists.
- Dark mode provider exists, but backlog still calls out a complete toggle/UX pass.
- Keep workspace context visible in navigation because all data is tenant-scoped.
