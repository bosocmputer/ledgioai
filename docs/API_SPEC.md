# LEDGIO AI — API Specification

> Current source of truth for route handlers, auth, request shape, and response shape.
> Updated May 2026 from the actual `app/api/**/route.ts` files.

## Authentication

All business APIs require a Better Auth session, except:

- `/api/auth/*`
- `/api/health`
- `/share/[token]` page access

The active tenant is `session.activeOrganizationId`. In product language this is a **Workspace**; in Better Auth schema it is an `organization`.

Common auth flow:

1. Login/register through Better Auth at `/api/auth/[...all]`.
2. Client sets active workspace through the Better Auth organization client.
3. API routes call `requireAuth()` or `requirePermission()`.
4. Every business query filters by `workspaceId`.

Common responses:

```ts
// Success
{ data: T }

// Error
{ error: string, details?: unknown }

// Some list routes also return supporting metadata
{ data: T[], stats?: unknown }
```

## Permissions

Permissions are enforced by [lib/auth/permissions.ts](/Users/nontawatwongnuk/dev_bos/ledgioai/lib/auth/permissions.ts).

Roles:

| Role | Notes |
| --- | --- |
| `owner` | Full workspace access |
| `admin` | Full workspace operations except owner-only future actions |
| `member` | Can read, start meetings, and currently create/update agents and memory |
| `viewer` | Read-only for meetings, agents, teams, memory, settings, members |

The current code uses a local role-to-permission map after reading `member.role` from the Better Auth organization membership table.

## Route Inventory

### Auth

| Method | Route | Description |
| --- | --- | --- |
| `GET/POST` | `/api/auth/[...all]` | Better Auth catch-all handler |

### Workspaces

| Method | Route | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/api/workspaces` | session | List workspaces for current user |
| `POST` | `/api/workspaces` | session | Checks max workspace limit; actual create is Better Auth organization client |
| `GET` | `/api/workspaces/[id]` | member access | Get workspace details |
| `PUT` | `/api/workspaces/[id]` | admin/owner intent | Update workspace metadata/name |
| `DELETE` | `/api/workspaces/[id]` | owner intent | Delete workspace |
| `POST` | `/api/workspaces/[id]/invite` | `member:invite` | Create Better Auth organization invitation |
| `GET` | `/api/workspaces/[id]/members` | `member:read` | List workspace members |

### Agents

| Method | Route | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/api/agents` | `agent:read` | List active agents in active workspace |
| `POST` | `/api/agents` | `agent:create` | Create agent; API key is encrypted before storage |
| `GET` | `/api/agents/[id]` | `agent:read` | Get one agent scoped by workspace |
| `PUT` | `/api/agents/[id]` | `agent:update` | Update agent; re-encrypts API key when provided |
| `DELETE` | `/api/agents/[id]` | `agent:delete` | Soft-delete agent |
| `POST` | `/api/agents/generate-soul` | `agent:create` | Generate an agent soul/system prompt |

Public agent responses never expose `apiKeyEncrypted`; they expose `hasApiKey`.

Create agent request:

```ts
{
  name: string
  emoji: string
  provider: "anthropic" | "openai" | "gemini" | "ollama" | "openrouter" | "custom"
  apiKey: string
  baseUrl?: string
  model: string
  soul: string
  role: string
  useWebSearch?: boolean
  seniority?: number
  mcpEndpoint?: string
  mcpAccessMode?: string
  trustedUrls?: string[]
  templateId?: string
}
```

### Agent Knowledge

| Method | Route | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/api/agents/[id]/knowledge` | `agent:read` | List parsed knowledge files for an agent |
| `POST` | `/api/agents/[id]/knowledge/upload` | `agent:update` | Upload and parse PDF, Excel, Word, CSV, JSON, TXT, or Markdown |
| `DELETE` | `/api/agents/[id]/knowledge/[knowledgeId]` | `agent:update` | Delete a knowledge item |

Uploads are parsed by [lib/documents/parser.ts](/Users/nontawatwongnuk/dev_bos/ledgioai/lib/documents/parser.ts). Max file size is currently 10 MB.

### Teams

| Method | Route | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/api/teams` | currently `agent:read` | List teams with populated agents |
| `POST` | `/api/teams` | currently `agent:create` | Create a team and assign agents |
| `GET` | `/api/teams/[id]` | `team:read` intent | Get team details |
| `PUT` | `/api/teams/[id]` | `team:update` intent | Update team and assignment |
| `DELETE` | `/api/teams/[id]` | `team:delete` intent | Soft-delete team |

Create team request:

```ts
{
  name: string
  emoji: string
  description?: string
  agentIds: string[]
}
```

### Meetings

| Method | Route | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/api/meetings` | `meeting:read` | Meeting history with stats |
| `POST` | `/api/meetings/stream` | `meeting:start` | Start a meeting and stream SSE events |
| `GET` | `/api/meetings/[id]` | `meeting:read` | Meeting detail and transcript |
| `DELETE` | `/api/meetings/[id]` | `meeting:read` intent | Delete/hide meeting depending on query implementation |
| `POST` | `/api/meetings/[id]/rate` | `meeting:read` | Save rating/comment |
| `GET` | `/api/meetings/[id]/report` | `meeting:read` | Generate printable/downloadable report |
| `POST` | `/api/meetings/[id]/share` | `meeting:read` | Create share token |
| `PUT` | `/api/meetings/[id]/tags` | `meeting:read` | Update tags |

`/api/meetings/stream` accepts JSON or `multipart/form-data`.

JSON request:

```ts
{
  question: string
  mode: "quick_ask" | "consult" | "full_board"
  agentIds: string[]
  teamId?: string
  clarificationAnswers?: Array<{ question: string; answer: string }>
}
```

Multipart fields:

```txt
question: string
mode: quick_ask | consult | full_board
agentIds: JSON string array
teamId?: string
clarificationAnswers?: JSON string array
files?: File[]
```

SSE event types currently used by the UI:

| Event | Purpose |
| --- | --- |
| `session` | Sends `meetingId` and `mode` |
| `status` | Human-readable progress text |
| `phase` | Full Board phase changes |
| `agent_start` | Agent begins work |
| `chunk` | Streaming token chunk |
| `message` | Complete message for a phase |
| `agent_done` | Agent completed |
| `clarification` | Full Board needs user answers |
| `memory_update` | Extracted memory facts |
| `done` | Meeting completed |
| `error` | Meeting-level error |

Timeout guards:

| Mode | Timeout |
| --- | --- |
| `quick_ask` | 30 seconds |
| `consult` | 90 seconds |
| `full_board` | 300 seconds |

### Memory

| Method | Route | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/api/memory` | `memory:read` | List memory facts |
| `POST` | `/api/memory` | `memory:update` | Create/update memory fact |
| `PUT` | `/api/memory/[id]` | `memory:update` | Update memory fact |
| `DELETE` | `/api/memory/[id]` | `memory:delete` | Delete memory fact |

### Templates

| Method | Route | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/api/agent-templates` | session/agent read intent | List built-in and workspace templates |
| `GET/POST` | `/api/meeting-templates` | meeting/template intent | List or create meeting prompt templates |

Production currently has 8 built-in agent templates and 0 meeting templates.

### Stats, Audit, Compliance

| Method | Route | Permission | Description |
| --- | --- | --- | --- |
| `GET` | `/api/stats` | `meeting:read` or stats intent | Basic usage stats |
| `GET` | `/api/stats/insights` | `meeting:read` | Insights dashboard data and cost KPIs |
| `GET` | `/api/audit` | admin/member read intent | Audit logs |
| `GET` | `/api/compliance/export` | authenticated | PDPA-style workspace/user data export |

### Notifications and Scheduling

| Method | Route | Description |
| --- | --- | --- |
| `POST` | `/api/notify/line` | Send LINE Notify-style notification |
| `POST` | `/api/notify/webhook` | Outbound webhook notification |
| `GET/POST` | `/api/scheduled-meetings` | Scheduled meeting CRUD foundation |

### Health

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Checks database and Redis |

Production health sample:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

## Implementation Notes

- API routes should use query helpers under [lib/db/queries](/Users/nontawatwongnuk/dev_bos/ledgioai/lib/db/queries), not ad hoc SQL in route handlers.
- Every business query must include `workspaceId`.
- Soft delete is preferred for business records that have `deletedAt`.
- Mutation routes generally call `rateLimitByUser()`.
- Important mutations call `logAudit()`.
- Do not expose encrypted secrets in JSON responses.
