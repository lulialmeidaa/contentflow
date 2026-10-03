#!/usr/bin/env sh
# Atualiza o ContentFlow na VPS: puxa a main e recria só o container dele.
set -e
cd "$(dirname "$0")"
git pull --ff-only
docker compose up -d --build
docker image prune -f --filter "label=com.docker.compose.project=contentflow" >/dev/null 2>&1 || true
docker compose ps
