#!/usr/bin/env bash
set -euo pipefail

# Migrations Prisma uniquement. Le build Next est dans npm prestart
# (test -f .next/standalone/server.js || npm run build), pas ici :
# Clever Cloud n'a pas d'étape de build Node native.
# Ne jamais utiliser `prisma migrate dev` ici.
npx prisma migrate deploy
