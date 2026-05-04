# LEDGIO AI — Database Schema

> Current PostgreSQL + Drizzle schema. Updated May 2026 from `lib/db/schema/*.ts`.

## Design Principles

- Better Auth owns auth-compatible tables.
- Product terminology says **Workspace**; schema term is Better Auth `organization`.
- Business tables are scoped by `workspace_id`.
- Current auth/user/workspace ids are `text`, not UUID.
- Most business entity primary keys are UUID.
- Soft delete is used where the schema has `deleted_at`.
- Secrets are encrypted before storage.

## ID Types

| Field family | Type | Reason |
| --- | --- | --- |
| `user.id` | `text` | Better Auth |
| `organization.id` | `text` | Better Auth organization = Workspace |
| `member.user_id` / `session.user_id` | `text` | Better Auth |
| Business `workspace_id` | `text` | References Better Auth organization id by convention |
| Business entity `id` | `uuid` | App-owned entities |

## Tables

Production currently has 20 tables:

```txt
account
agent_knowledge
agent_stats
agent_templates
agents
audit_logs
invitation
meeting_messages
meeting_templates
meetings
member
memory_facts
organization
scheduled_meetings
session
team_agents
teams
user
verification
workspace_settings
```

## Better Auth Tables

Defined in [lib/db/schema/auth.ts](/Users/nontawatwongnuk/dev_bos/ledgioai/lib/db/schema/auth.ts).

### `user`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | primary key |
| `name` | text | required |
| `email` | text | unique |
| `email_verified` | boolean | default false |
| `image` | text | nullable |
| `created_at` / `updated_at` | timestamp | required |

### `session`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | primary key |
| `token` | text | unique |
| `user_id` | text | FK to `user.id` |
| `active_organization_id` | text | active Workspace id |
| `expires_at` | timestamp | required |
| `ip_address` / `user_agent` | text | nullable |

### `account`

Stores email/password and future provider account records. Password hashes live in `account.password`.

### `verification`

Stores Better Auth verification tokens.

### `organization`

Workspace table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | primary key |
| `name` | text | workspace display name |
| `slug` | text | unique nullable |
| `logo` | text | nullable |
| `metadata` | text | nullable JSON-ish payload |
| `created_at` | timestamp | required |

### `member`

User-workspace membership.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | primary key |
| `organization_id` | text | FK to `organization.id` |
| `user_id` | text | FK to `user.id` |
| `role` | text | `owner`, `admin`, `member`, `viewer` |
| `created_at` | timestamp | required |

### `invitation`

Workspace invitations.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text | primary key |
| `organization_id` | text | FK to workspace |
| `email` | text | invited address |
| `role` | text | nullable |
| `status` | text | default `pending` |
| `expires_at` | timestamp | required |
| `inviter_id` | text | FK to `user.id` |

## Business Tables

### `agents`

AI expert configuration.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `workspace_id` | text | required tenant scope |
| `template_id` | uuid | nullable |
| `name`, `emoji`, `role`, `soul` | varchar/text | identity and system prompt |
| `provider` | enum | `anthropic`, `openai`, `gemini`, `ollama`, `openrouter`, `custom` |
| `model` | varchar | model name |
| `api_key_encrypted` | text | encrypted secret |
| `base_url` | varchar | for custom/Ollama/OpenRouter-compatible endpoints |
| `seniority` | integer | lower means more senior |
| `use_web_search` | boolean | default false |
| `trusted_urls` | text | JSON string |
| `mcp_endpoint`, `mcp_access_mode` | varchar | optional MCP config |
| `is_active` | boolean | default true |
| `created_at`, `updated_at`, `deleted_at` | timestamp | soft delete supported |

Indexes:

- `agents_workspace_idx`

### `agent_knowledge`

Parsed documents attached to agents.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `agent_id` | uuid | FK to `agents.id`, cascade delete |
| `workspace_id` | text | required tenant scope |
| `filename`, `mime_type`, `meta` | varchar | file metadata |
| `content` | text | parsed text |
| `tokens` | integer | estimated tokens |
| `uploaded_at` | timestamp | required |

### `agent_templates`

Built-in or workspace-specific agent blueprints. `workspace_id = null` means system template.

Fields mirror agent identity and recommended defaults, plus `category`, `tags`, `description`, and `is_public`.

### `teams`

Workspace-scoped group of agents.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `workspace_id` | text | required tenant scope |
| `name`, `emoji`, `description` | varchar/text | display data |
| `created_at`, `updated_at`, `deleted_at` | timestamp | soft delete supported |

### `team_agents`

Join table between teams and agents.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `team_id` | uuid | FK to `teams.id`, cascade delete |
| `agent_id` | uuid | FK to `agents.id`, cascade delete |

Unique constraint:

- `team_agents_unique` on `(team_id, agent_id)`

### `meetings`

Meeting sessions for Quick Ask, Consult, and Full Board.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `workspace_id` | text | required tenant scope |
| `user_id` | text | Better Auth user id |
| `question` | text | original user question |
| `mode` | enum | `quick_ask`, `consult`, `full_board` |
| `status` | enum | `running`, `completed`, `error`, `cancelled` |
| `agent_ids` | text | JSON string array |
| `team_id` | uuid | nullable |
| `file_contexts` | text | JSON/file summary |
| `metadata` | text | errors, clarification state, etc. |
| `final_answer` | text | nullable |
| `total_tokens` | integer | default 0 |
| `rating` | smallint | 1-5 stars |
| `share_token` | text | public share token |
| `tags` | text | JSON string array |
| `language` | text | default `th` |
| `started_at`, `completed_at` | timestamp | lifecycle |

### `meeting_messages`

Transcript rows.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `meeting_id` | uuid | FK to `meetings.id`, cascade delete |
| `workspace_id` | text | required tenant scope |
| `agent_id` | uuid | agent at time of message |
| `agent_name`, `agent_emoji` | varchar | denormalized display |
| `phase` | enum | `clarification`, `analysis`, `finding`, `discussion`, `synthesis`, `quick_answer`, `web_source`, `system` |
| `content` | text | message body |
| `tokens_used` | integer | default 0 |
| `sources` | text | optional JSON/source string |
| `timestamp` | timestamp | required |

### `memory_facts`

Workspace memory injected into future meetings.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `workspace_id` | text | required tenant scope |
| `key` | varchar | memory key |
| `value` | text | memory value |
| `category` | varchar | optional |
| `source` | varchar | optional |
| `confidence` | integer | default 100 |
| `created_at`, `updated_at` | timestamp | required |

Unique constraint:

- `memory_workspace_key` on `(workspace_id, key)`

### `agent_stats`

Daily usage per agent.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `agent_id` | uuid | FK to `agents.id` |
| `workspace_id` | text | required tenant scope |
| `date` | varchar(10) | `YYYY-MM-DD` |
| `meetings` | integer | default 0 |
| `input_tokens` | integer | default 0 |
| `output_tokens` | integer | default 0 |
| `cache_read_tokens` | integer | default 0 |

Unique constraint:

- `stats_agent_date` on `(agent_id, date)`

### `workspace_settings`

Workspace-level settings, feature flags, and quotas.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `workspace_id` | text | unique |
| `serper_api_key_encrypted` | text | nullable |
| `serp_api_key_encrypted` | text | nullable |
| `default_provider` | enum | nullable |
| `default_model` | varchar | nullable |
| `max_tokens_per_meeting` | integer | default 50000 |
| `max_meetings_per_day` | integer | default 100 |
| `enable_web_search` | boolean | default true |
| `enable_mcp` | boolean | default false |
| `mcp_endpoint` | varchar | nullable |
| `updated_at` | timestamp | required |

### `audit_logs`

Security and activity log.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `workspace_id` | text | required tenant scope |
| `user_id` | text | required |
| `action` | varchar | e.g. `agent.create` |
| `resource` | varchar | e.g. `agent` |
| `resource_id` | text | nullable |
| `details` | jsonb | nullable |
| `ip_address`, `user_agent` | varchar/text | nullable |
| `created_at` | timestamp | required |

### `meeting_templates`

Reusable prompts. `workspace_id = null` means system/public template.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `workspace_id` | text | nullable |
| `name`, `emoji`, `description` | text | display data |
| `question` | text | template prompt |
| `mode` | text | default `full_board` |
| `suggested_agent_roles` | text | JSON string array |
| `category` | text | nullable |
| `is_public` | boolean | default false |
| `created_at`, `updated_at` | timestamp | required |

### `scheduled_meetings`

Scheduling foundation.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | primary key |
| `workspace_id` | text | required tenant scope |
| `user_id` | text | required |
| `question` | text | required |
| `mode` | text | default `full_board` |
| `agent_ids` | text | JSON string array |
| `team_id` | uuid | nullable |
| `scheduled_at` | timestamp | required |
| `cron_expr` | text | null for one-time |
| `is_active` | boolean | default true |
| `last_run_at` | timestamp | nullable |
| `meeting_id` | uuid | last generated meeting |
| `created_at`, `updated_at` | timestamp | required |

## Current Production Counts

Latest read-only server check:

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

## Query Rules

- All business queries must filter by `workspace_id`.
- Use query helpers under [lib/db/queries](/Users/nontawatwongnuk/dev_bos/ledgioai/lib/db/queries).
- Use soft delete filters where `deleted_at` exists.
- Never expose encrypted keys from `agents` or `workspace_settings`.
- Validate route input before DB writes.
