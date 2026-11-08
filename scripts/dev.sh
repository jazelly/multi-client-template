#!/usr/bin/env bash
# Set up and start local development on a fresh clone, or just start it again. Every step checks first and skips
# work that is already done, so run it any time:
#   pnpm dev     set up whatever is missing, then start the server (3100) and the web app (5173)
#   pnpm dev:setup   set up only
# Needs Node 24, pnpm and a running Docker Desktop.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
SERVER=$ROOT/apps/server
START=1
[ "${1:-}" = --no-start ] && START=0

step() { printf '\n== %s\n' "$*"; }
ok() { printf '   %s\n' "$*"; }
die() { printf '\nError: %s\n' "$*" >&2; exit 1; }

step "Tools"
command -v node >/dev/null || die "Node is not installed."
command -v pnpm >/dev/null || die "pnpm is not installed (corepack enable)."
command -v docker >/dev/null || die "Docker is not installed (Docker Desktop)."
docker info >/dev/null 2>&1 || die "Docker is not running. Open Docker Desktop and run this again."
ok "node $(node -v), pnpm $(pnpm -v)"

step "Dependencies"
cd "$ROOT"
if [ ! -f node_modules/.modules.yaml ] || [ pnpm-lock.yaml -nt node_modules/.modules.yaml ]; then
  pnpm install --frozen-lockfile
  ok "installed"
else
  ok "up to date"
fi

step "apps/server/.env"
if [ -f "$SERVER/.env" ]; then
  ok "exists"
else
  cp "$SERVER/.env.example" "$SERVER/.env"
  ok "created from .env.example"
fi

step "Postgres"
docker compose up -d --wait >/dev/null 2>&1 || die "Postgres did not start; run 'docker compose up -d --wait' to see why."
ok "healthy on 127.0.0.1:5434"

step "Migrations"
cd "$SERVER"
pnpm --silent db:migrate >/dev/null || die "migrations failed; run 'pnpm db:migrate' in apps/server to see why."
ok "database is up to date"

step "Demo org and test sign-ins"
pnpm --silent seed | sed 's/^/   /'

[ "$START" = 1 ] || { ok "set up; start with: pnpm dev"; exit 0; }

step "Server http://localhost:3100 and web http://localhost:5173 (Ctrl+C stops both)"
cd "$ROOT"
exec pnpm --parallel --filter server --filter web dev
