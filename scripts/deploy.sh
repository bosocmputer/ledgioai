#!/bin/bash
# Manual deploy script for LEDGIO AI
# Usage: ./scripts/deploy.sh

set -e

echo "🏗️  Building Docker image..."
docker build -t ledgioai:latest .

echo "📦 Saving image..."
docker save ledgioai:latest | gzip > /tmp/ledgioai.tar.gz

echo "📤 Uploading to server..."
scp /tmp/ledgioai.tar.gz bosscatdog@192.168.2.109:/tmp/
scp docker-compose.yml bosscatdog@192.168.2.109:/home/bosscatdog/deploy/ledgioai/

echo "🚀 Deploying..."
ssh bosscatdog@192.168.2.109 << 'EOF'
  cd /home/bosscatdog/deploy/ledgioai
  docker load < /tmp/ledgioai.tar.gz
  docker compose up -d --remove-orphans
  rm /tmp/ledgioai.tar.gz
  docker system prune -f

  # Health check
  sleep 10
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3004/api/health)
  if [ "$STATUS" = "200" ]; then
    echo "✅ Deploy complete — health check passed"
  else
    echo "⚠️  Deploy complete — health check returned $STATUS"
    docker logs ledgioai --tail 20
  fi
EOF
