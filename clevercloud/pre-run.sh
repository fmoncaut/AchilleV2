#!/usr/bin/env bash
set -euo pipefail

# Clever Cloud installe les dépendances, puis lance `npm start`.
# Il n'exécute pas `npm run build` : sans ce hook, `.next/standalone/server.js` est absent.
# Build d'abord : un échec de compilation ne migre pas la base de l'instance encore en ligne.
npm run build

# Migrations Prisma. Ne jamais utiliser `prisma migrate dev` ici.
npx prisma migrate deploy
