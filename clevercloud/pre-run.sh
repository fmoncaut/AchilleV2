#!/usr/bin/env bash
set -euo pipefail

# Migrations Prisma uniquement. Le build Next est dans npm prestart
# (test -f .next/standalone/server.js || npm run build), pas ici :
# Clever Cloud n'a pas d'étape de build Node native.
# Ne jamais utiliser `prisma migrate dev` ici.
# L'add-on Clever injecte POSTGRESQL_ADDON_URI. DATABASE_URL doit être cette URL ;
# si la console en contient une autre, on reprend l'URI de l'add-on pour migrer.
case "${DATABASE_URL:-}" in
  postgresql://*|postgres://*) ;;
  *)
    if [ -n "${POSTGRESQL_ADDON_URI:-}" ]; then
      echo "DATABASE_URL n'est pas une URL Postgres, utilisation de POSTGRESQL_ADDON_URI."
      export DATABASE_URL="$POSTGRESQL_ADDON_URI"
    fi
    ;;
esac
npx prisma migrate deploy
