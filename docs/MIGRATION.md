# LEDGIO AI — Migration Notes from BossBoard

> Current migration reference. Updated May 2026 to match the Workspace/Better Auth schema.

## Status

BossBoard migration is no longer part of the normal app runtime. Treat this document as an archival/import guide for one-off data migration from the older JSON-file demo into LEDGIO AI production.

The current product schema uses:

- Better Auth `user`, `organization`, `member`, `session`, `account`, `verification`, `invitation`
- Business tables with `workspace_id`, not `company_id`
- `meetings` and `meeting_messages`, not `research_sessions` and `research_messages`
- AES-256-GCM encryption via [lib/encryption.ts](/Users/nontawatwongnuk/dev_bos/ledgioai/lib/encryption.ts)

## Old BossBoard Data

BossBoard stored JSON files under `~/.bossboard/`:

```txt
~/.bossboard/
├── agents.json
├── teams.json
├── research-history.json
├── settings.json
├── client-memory.json
├── agent-stats.json
└── .encrypt-key
```

## Current Target Tables

| Old concept | Current target |
| --- | --- |
| Company/client info | `organization` + `workspace_settings.metadata` |
| Agent | `agents` |
| Agent knowledge | `agent_knowledge` |
| Team | `teams` + `team_agents` |
| Research session | `meetings` |
| Research message | `meeting_messages` |
| Client memory | `memory_facts` |
| Agent stats | `agent_stats` |
| Settings/API keys | `workspace_settings` and encrypted agent keys |

## Migration Checklist

Before import:

- Back up all BossBoard JSON files.
- Save the old `.encrypt-key`.
- Create or choose a Better Auth user.
- Create or choose a Better Auth organization/workspace.
- Confirm `ENCRYPTION_KEY` is set to a 64-character hex string.
- Run the import against a staging database first.

Import order:

1. Workspace metadata from `settings.json`.
2. Agents from `agents.json`.
3. Agent knowledge embedded in old agents.
4. Teams and team-agent assignments.
5. Memory facts from `client-memory.json`.
6. Agent stats from `agent-stats.json`.
7. Meeting history/messages from `research-history.json`.

After import:

- Verify record counts.
- Decrypt/re-encrypt at least one old API key and test a Quick Ask.
- Test meeting history detail pages.
- Test memory facts appear in meeting context.
- Keep old JSON backup until production has been verified.

## Current Script

The repository contains [scripts/migrate-from-bossboard.ts](/Users/nontawatwongnuk/dev_bos/ledgioai/scripts/migrate-from-bossboard.ts).

Before using it again, review it against the current schema. Any references to `companyId`, `companies`, `userCompanies`, `researchSessions`, or `researchMessages` must be converted to:

- `workspaceId`
- Better Auth `organization` and `member`
- `meetings`
- `meeting_messages`

## Known Gotchas

- Better Auth does not use the old custom `users.hashedPassword` shape.
- Workspace creation should go through Better Auth organization semantics or insert compatible `organization`/`member` rows deliberately.
- Agent API keys must be decrypted from BossBoard's AES-256-CBC format, then encrypted with LEDGIO AI's AES-256-GCM helper.
- Old research history may not have the same phases as the current meeting engine; map unknown phases to a readable legacy phase string.
- Do not import deleted or test agents unless the target workspace needs them.

## Production Baseline

The current production database already has the expected 20 tables:

```txt
account, agent_knowledge, agent_stats, agent_templates, agents,
audit_logs, invitation, meeting_messages, meeting_templates, meetings,
member, memory_facts, organization, scheduled_meetings, session,
team_agents, teams, user, verification, workspace_settings
```
