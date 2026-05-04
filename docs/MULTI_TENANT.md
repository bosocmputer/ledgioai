# LEDGIO AI — Multi-Tenant Architecture

> Current workspace isolation model. Updated May 2026 from the actual Better Auth + Drizzle implementation.

## Terminology

| Product term | Code/schema term | Notes |
| --- | --- | --- |
| Workspace | `organization` | Better Auth organization table |
| Workspace member | `member` | Better Auth member table |
| Active workspace | `session.activeOrganizationId` | Tenant id used by API routes |
| Workspace role | `member.role` | `owner`, `admin`, `member`, `viewer` |

Older planning docs used `Company` and `company_id`. The current app uses **Workspace** and `workspace_id`.

## Tenancy Strategy

LEDGIO AI uses one PostgreSQL database with row-level workspace isolation:

```txt
PostgreSQL
├── Better Auth global/user tables
│   ├── user
│   ├── session
│   ├── account
│   ├── verification
│   ├── organization   <- Workspace
│   ├── member         <- User-to-workspace role
│   └── invitation
│
└── LEDGIO business tables scoped by workspace_id
    ├── agents
    ├── agent_knowledge
    ├── teams
    ├── team_agents
    ├── meetings
    ├── meeting_messages
    ├── memory_facts
    ├── agent_stats
    ├── workspace_settings
    ├── audit_logs
    ├── meeting_templates
    └── scheduled_meetings
```

This keeps operations simple on the single production server while still allowing many customer workspaces.

## Active Workspace Flow

1. User logs in through Better Auth.
2. `WorkspaceProvider` loads the user's organizations.
3. `WorkspaceGuard` ensures there is an active workspace and can create a default one on first login.
4. The active workspace id is stored by Better Auth as `session.activeOrganizationId`.
5. API routes read that id through `requireAuth()` or `requirePermission()`.

Server helper:

```ts
const session = await auth.api.getSession({ headers: request.headers })
const workspaceId = (session.session as Record<string, unknown>).activeOrganizationId
```

Query pattern:

```ts
export async function getAgentById(agentId: string, workspaceId: string) {
  return db
    .select()
    .from(agents)
    .where(and(
      eq(agents.id, agentId),
      eq(agents.workspaceId, workspaceId),
      isNull(agents.deletedAt),
    ))
    .limit(1)
}
```

## Data Isolation Rules

Critical rules for every feature:

- Never read or mutate business data by `id` alone.
- Always include `workspaceId` in route-to-query contracts.
- Check `deletedAt` for soft-deletable records.
- Strip secrets like `apiKeyEncrypted` before returning JSON.
- For nested objects, verify the parent belongs to the active workspace before operating on children.

Scoped entities:

| Entity | Scope |
| --- | --- |
| Agents | `workspace_id` |
| Agent knowledge | `workspace_id` + `agent_id` |
| Teams | `workspace_id` |
| Team agents | via team and agent workspace ownership |
| Meetings | `workspace_id` + `user_id` |
| Meeting messages | `workspace_id` + `meeting_id` |
| Memory facts | `workspace_id` |
| Agent stats | `workspace_id` + `agent_id` |
| Workspace settings | `workspace_id` |
| Audit logs | `workspace_id` |
| Meeting templates | global or `workspace_id` |
| Scheduled meetings | `workspace_id` |

Global entities:

| Entity | Why |
| --- | --- |
| `user` | A user can belong to many workspaces |
| `account` | Auth provider identity belongs to user |
| `session` | Auth session belongs to user, with active workspace pointer |
| `organization` | Workspace record itself |
| `member` | Membership bridge |
| `invitation` | Pending workspace invite |

## Roles and Permissions

Roles are stored in Better Auth `member.role`. Permission enforcement currently lives in [lib/auth/permissions.ts](/Users/nontawatwongnuk/dev_bos/ledgioai/lib/auth/permissions.ts).

| Action | owner | admin | member | viewer |
| --- | :---: | :---: | :---: | :---: |
| Read agents/teams/memory/settings | yes | yes | yes | yes |
| Start meeting | yes | yes | yes | no |
| Create/update agents | yes | yes | yes, currently | no |
| Delete agents | yes | yes | no | no |
| Create/update memory | yes | yes | yes, currently | no |
| Invite/read members | yes | yes | read only | read only |

Note: `member` is intentionally permissive in the current code. Tightening that role is a product decision, not a database limitation.

## Workspace UI Surface

Current workspace-related UI:

- Sidebar workspace switcher
- Workspace list page at `/workspaces`
- Workspace guard that creates/selects a workspace
- Settings page foundation

Important UX implication: workspace identity should be visible and easy to switch, because almost every screen is scoped by the active workspace.

## Production Snapshot

As of the latest server check:

| Metric | Count |
| --- | ---: |
| Users | 3 |
| Workspaces | 3 |
| Agents | 7 |
| Teams | 2 |
| Meetings | 9 |
| Agent templates | 8 |
| Meeting templates | 0 |
| Memory facts | 6 |

## Future Scale Path

The current shared database model is suitable for the single-server deployment. If the product grows beyond one server/database, the natural next steps are:

1. Add stronger indexes around high-volume workspace queries.
2. Add per-workspace quotas and billing metadata.
3. Add audit tooling for cross-workspace admin views.
4. Later shard by `workspace_id` only if usage demands it.
