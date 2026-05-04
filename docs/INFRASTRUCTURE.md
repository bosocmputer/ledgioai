# LEDGIO AI — Infrastructure & Deployment

> Current deployment notes. Updated May 2026 from the live server and local Docker files.

## Production Server

| Spec | Value |
| --- | --- |
| Host | `192.168.2.109` |
| User | `bosscatdog` |
| OS | Ubuntu 24.04 LTS |
| Docker | 29.3.0 + Compose 5.1.1 |
| App port | `3004 -> 3000` |
| Production path | `/home/bosscatdog/deploy/ledgioai/src` |
| App container | `ledgioai` |
| DB container | `ledgioai-db` |
| Redis container | `ledgioai-redis` |

Live health check:

```bash
curl http://127.0.0.1:3004/api/health
```

Expected healthy response:

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

## Current Live Snapshot

Last checked from the server:

| Item | Value |
| --- | --- |
| Live app status | `healthy` |
| Live app image | `src-app` |
| Live server branch | `main` |
| Live server commit | `bb26133 fix: resolve 4 runtime bugs from testing` |
| Local repo commit at check time | `67c993d feat: add Sentry error tracking + Token Quota enforcement` |
| Server dirty file | `docker-compose.yml` |
| Dirty change | Health check uses `127.0.0.1` instead of `localhost` |

The server may lag behind local `main`; check before deploying UX/UI work.

## Other Services on Server

The server hosts several projects. Current notable ports:

| Service | Port |
| --- | --- |
| OpenClaw Admin | `3000` |
| Centrix Web | `3002` |
| BossBoard | `3003` |
| LEDGIO AI | `3004` |
| Omnia AI | `3005` |
| PostgreSQL/OpenClaw | `5432` |
| PostgreSQL/Centrix | `5434` |
| PostgreSQL/LEDGIO AI | `5436` |
| Redis/Centrix | `6380` |
| Redis/LEDGIO AI | `6381` |

## Docker Compose

The local [docker-compose.yml](/Users/nontawatwongnuk/dev_bos/ledgioai/docker-compose.yml) currently runs only the app service and connects to host-provided Postgres/Redis through `host.docker.internal`.

Key app settings:

```yaml
services:
  app:
    container_name: ledgioai
    ports:
      - "3004:3000"
    env_file: .env
    environment:
      - NODE_ENV=production
    extra_hosts:
      - "host.docker.internal:host-gateway"
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000/api/health"]
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "2.0"
```

Production env currently points to:

```env
DATABASE_URL=postgresql://ledgioai:***@host.docker.internal:5436/ledgioai
REDIS_URL=redis://host.docker.internal:***
BETTER_AUTH_URL=http://192.168.2.109:3004
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
```

Secrets are stored in the server `.env`; never commit them.

## Dockerfile

The app builds as a Next.js standalone image:

1. `node:22-alpine` builder
2. `npm ci`
3. `npx drizzle-kit generate`
4. `npm run build`
5. Copy `.next/standalone`, `.next/static`, `public`, and `drizzle`
6. Run `node server.js` as the `node` user

The Dockerfile health check uses IPv4 loopback:

```dockerfile
CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1
```

## Environment Variables

Required:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `BETTER_AUTH_URL` | Public app origin used by Better Auth |
| `AUTH_SECRET` or Better Auth secret env | Auth signing secret, depending on Better Auth config |
| `ENCRYPTION_KEY` | 64 hex chars for AES-256-GCM |
| `NODE_ENV` | `production` in container |

Optional:

| Variable | Purpose |
| --- | --- |
| `LOG_LEVEL` | Pino log level |
| `SENTRY_DSN` | Sentry runtime reporting |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Sentry source map upload during build |

## Database

Production database is PostgreSQL 16. Current table count is 20:

```txt
account, agent_knowledge, agent_stats, agent_templates, agents,
audit_logs, invitation, meeting_messages, meeting_templates, meetings,
member, memory_facts, organization, scheduled_meetings, session,
team_agents, teams, user, verification, workspace_settings
```

Latest production counts from a read-only check:

| Table group | Count |
| --- | ---: |
| Users | 3 |
| Workspaces | 3 |
| Agents | 7 |
| Teams | 2 |
| Meetings | 9 |
| Agent templates | 8 |
| Meeting templates | 0 |
| Memory facts | 6 |

## Logs and Monitoring

Useful read-only checks:

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
docker logs --tail 80 ledgioai
docker stats --no-stream ledgioai ledgioai-db ledgioai-redis
docker exec ledgioai-db psql -U ledgioai -d ledgioai -c "\dt"
```

Known runtime warning:

- `pdfjs-dist` warns that `@napi-rs/canvas` is missing.
- The app still starts and health check passes.
- Test real PDF uploads before declaring document upload production-ready.

## Deployment Checklist

Before deploy:

- Confirm local branch and server branch are both `main`.
- Check server dirty files, especially `docker-compose.yml`.
- Run `npm run build` locally.
- Confirm migrations/schema generation are expected.
- Do not overwrite server `.env`.

Manual deploy shape:

```bash
docker build -t ledgioai:latest .
docker save ledgioai:latest | gzip > /tmp/ledgioai.tar.gz
scp /tmp/ledgioai.tar.gz bosscatdog@192.168.2.109:/tmp/
ssh bosscatdog@192.168.2.109
cd /home/bosscatdog/deploy/ledgioai/src
docker load < /tmp/ledgioai.tar.gz
docker compose up -d --remove-orphans
curl http://127.0.0.1:3004/api/health
```

## Backup

Recommended backup command:

```bash
docker exec ledgioai-db pg_dump -U ledgioai -d ledgioai \
  --format=custom --compress=9 \
  > /home/bosscatdog/backups/ledgioai/ledgioai_$(date +%Y%m%d_%H%M%S).dump
```

Restore shape:

```bash
docker compose stop app
docker exec -i ledgioai-db pg_restore -U ledgioai -d ledgioai --clean < backup.dump
docker compose start app
```

## Security Notes

- Security headers are configured in [next.config.ts](/Users/nontawatwongnuk/dev_bos/ledgioai/next.config.ts).
- API keys are encrypted with AES-256-GCM before DB storage.
- Business routes must be scoped by active `workspaceId`.
- Production credentials should only live in server `.env` or deployment secrets.
