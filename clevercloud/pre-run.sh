#!/usr/bin/env bash
set -euo pipefail

# Hook Clever Cloud (CC_PRE_RUN_HOOK) : applique les migrations Prisma
# en production. Ne jamais utiliser `prisma migrate dev` ici.
npx prisma migrate deploy
