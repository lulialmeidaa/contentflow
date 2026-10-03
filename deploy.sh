#!/usr/bin/env sh
# Atualiza o ContentFlow na VPS com a imagem mais recente do GitHub Actions.
# Recria só o container dele; os outros serviços não são tocados.
set -e
cd "$(dirname "$0")"
git pull --ff-only
docker compose pull
docker compose up -d
docker image prune -f --filter "reference=ghcr.io/lulialmeidaa/contentflow" >/dev/null 2>&1 || true
docker compose ps
