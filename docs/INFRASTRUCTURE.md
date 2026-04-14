# LEDGIO AI — Infrastructure & Deployment

> Docker, PostgreSQL, Redis, Cloudflare, CI/CD, Monitoring

## 🎯 Production Server

| Spec | Value |
|------|-------|
| Host | `192.168.2.109` |
| User | `bosscatdog` |
| CPU | Intel i3-8100 (4 cores, 3.60GHz, no HT) |
| RAM | 7.6 GB (~5 GB available) |
| Disk | 109 GB (25 GB free) |
| GPU | None |
| OS | Ubuntu 24.04 LTS |
| Docker | 29.3.0 + Compose 5.1.1 |

### Existing Services on Server

| Service | Port | Usage |
|---------|------|-------|
| PostgreSQL #1 | 5432 | OpenClaw |
| PostgreSQL #2 | 5434 | Centrix |
| Redis | 6380 | Centrix |
| Cloudflare Tunnels | — | 4 instances |
| BossBoard (demo) | 3003 | Current demo |
| OpenClaw Admin | 3000 | OpenClaw |
| Centrix Web | 3002 | Centrix frontend |
| Centrix API | 5001 | Centrix backend |
| **LEDGIO AI** | **3004** | **This project** |

## 🐳 Docker Compose

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ledgioai
    restart: unless-stopped
    ports:
      - "3004:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://ledgioai:${DB_PASSWORD}@db:5432/ledgioai
      - REDIS_URL=redis://redis:6379
      - AUTH_SECRET=${AUTH_SECRET}
      - AUTH_URL=${AUTH_URL}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      start_period: 15s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "2.0"
    networks:
      - ledgioai

  db:
    image: postgres:16-alpine
    container_name: ledgioai-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=ledgioai
      - POSTGRES_USER=ledgioai
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ledgioai"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 256M
          cpus: "1.0"
    networks:
      - ledgioai

  redis:
    image: redis:7-alpine
    container_name: ledgioai-redis
    restart: unless-stopped
    command: redis-server --maxmemory 64mb --maxmemory-policy allkeys-lru
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          memory: 128M
          cpus: "0.5"
    networks:
      - ledgioai

volumes:
  pgdata:
  redisdata:

networks:
  ledgioai:
    driver: bridge
```

## 📦 Dockerfile

```dockerfile
# Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Generate Drizzle migrations
RUN npx drizzle-kit generate

# Build Next.js
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Drizzle migrations for runtime
COPY --from=builder /app/drizzle ./drizzle

# Run as non-root
USER node

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start_period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

## 🔐 Environment Variables

```env
# .env.example

# === Database ===
DATABASE_URL=postgresql://ledgioai:password@db:5432/ledgioai
DB_PASSWORD=<strong-password>

# === Redis ===
REDIS_URL=redis://redis:6379

# === Auth ===
AUTH_SECRET=<openssl-rand-base64-32>
AUTH_URL=https://ledgio.ai

# === Encryption ===
ENCRYPTION_KEY=<64-hex-chars>
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# === Google OAuth (optional) ===
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# === Supermemory (optional) ===
# SUPERMEMORY_API_KEY=

# === Sentry (optional) ===
# SENTRY_DSN=
```

## 🌐 Cloudflare Tunnel

```yaml
# cloudflare-tunnel/config.yml
tunnel: <tunnel-id>
credentials-file: /etc/cloudflare/<tunnel-id>.json

ingress:
  - hostname: ledgio.ai
    service: http://localhost:3004
  - hostname: api.ledgio.ai
    service: http://localhost:3004
  - service: http_status:404
```

## 📊 Resource Budget

| Container | RAM | CPU | Disk |
|-----------|-----|-----|------|
| ledgioai (app) | 512 MB | 2 cores | ~200 MB image |
| PostgreSQL 16 | 256 MB | 1 core | ~5 GB data |
| Redis 7 | 128 MB | 0.5 core | ~50 MB |
| **Total** | **~900 MB** | **3.5 cores** | **~5.3 GB** |

Available on server: ~5 GB RAM, 4 cores, 25 GB disk → **Fits comfortably**

## 🗄️ Database Backup

### Automatic Daily Backup

```bash
#!/bin/bash
# scripts/backup-db.sh

BACKUP_DIR="/home/bosscatdog/backups/ledgioai"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
KEEP_DAYS=30

mkdir -p "$BACKUP_DIR"

# Dump database
docker exec ledgioai-db pg_dump -U ledgioai -d ledgioai \
  --format=custom --compress=9 \
  > "$BACKUP_DIR/ledgioai_${TIMESTAMP}.dump"

# Size check
SIZE=$(du -sh "$BACKUP_DIR/ledgioai_${TIMESTAMP}.dump" | cut -f1)
echo "[$(date)] Backup complete: $SIZE"

# Cleanup old backups
find "$BACKUP_DIR" -name "*.dump" -mtime +$KEEP_DAYS -delete
echo "[$(date)] Cleaned backups older than $KEEP_DAYS days"
```

### Cron Setup

```bash
# Run backup daily at 2:00 AM
0 2 * * * /home/bosscatdog/scripts/backup-db.sh >> /home/bosscatdog/logs/backup.log 2>&1
```

### Restore

```bash
# Stop app first
docker compose stop app

# Restore
docker exec -i ledgioai-db pg_restore -U ledgioai -d ledgioai --clean \
  < /home/bosscatdog/backups/ledgioai/ledgioai_20240115_020000.dump

# Restart
docker compose start app
```

## 🚀 CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t ledgioai:latest .

      - name: Save Docker image
        run: docker save ledgioai:latest | gzip > ledgioai.tar.gz

      - name: Deploy to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          password: ${{ secrets.SERVER_PASSWORD }}
          source: "ledgioai.tar.gz,docker-compose.yml"
          target: "/home/bosscatdog/deploy/ledgioai"

      - name: Start containers
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          password: ${{ secrets.SERVER_PASSWORD }}
          script: |
            cd /home/bosscatdog/deploy/ledgioai
            docker load < ledgioai.tar.gz
            docker compose up -d --remove-orphans
            docker system prune -f
            echo "Deploy complete: $(date)"
```

### Deploy Script (Manual)

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

echo "🏗️ Building..."
docker build -t ledgioai:latest .

echo "📦 Saving image..."
docker save ledgioai:latest | gzip > /tmp/ledgioai.tar.gz

echo "📤 Uploading..."
scp /tmp/ledgioai.tar.gz bosscatdog@192.168.2.109:/tmp/

echo "🚀 Deploying..."
ssh bosscatdog@192.168.2.109 << 'EOF'
  docker load < /tmp/ledgioai.tar.gz
  cd /home/bosscatdog/ledgioai
  docker compose up -d --remove-orphans
  rm /tmp/ledgioai.tar.gz
  echo "✅ Deploy complete"
EOF
```

## 📈 Monitoring

### Health Check Endpoint

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: false,
    redis: false,
  };
  
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = true;
  } catch {}
  
  try {
    await redis.ping();
    checks.redis = true;
  } catch {}
  
  const allHealthy = Object.values(checks).every(Boolean);
  
  return Response.json({
    status: allHealthy ? "ok" : "degraded",
    version: process.env.npm_package_version || "1.0.0",
    uptime: process.uptime(),
    ...checks,
  }, { status: allHealthy ? 200 : 503 });
}
```

### Logging (Pino)

```typescript
// lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: process.env.NODE_ENV === "development" 
    ? { target: "pino-pretty" } 
    : undefined,
  base: { service: "ledgioai" },
});

// Usage
logger.info({ companyId, agentId }, "Meeting started");
logger.error({ err, sessionId }, "LLM call failed");
```

### Sentry (Error Tracking — Optional)

```typescript
// sentry.server.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

## 🔒 Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://api.anthropic.com https://openrouter.ai https://api.openai.com https://generativelanguage.googleapis.com https://google.serper.dev https://serpapi.com https://api.supermemory.ai;"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()"
  },
];

export default {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

## 📁 Server Directory Structure

```
/home/bosscatdog/
  ├── ledgioai/
  │    ├── docker-compose.yml
  │    ├── .env                  # production env vars
  │    └── drizzle/              # migration files
  ├── backups/
  │    └── ledgioai/
  │         └── ledgioai_*.dump  # daily backups
  ├── logs/
  │    └── backup.log
  └── scripts/
       └── backup-db.sh
```
