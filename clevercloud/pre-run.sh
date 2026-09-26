#!/usr/bin/env bash
set -euo pipefail

# Clever Cloud n'a pas d'étape de build Node native.
# Ce hook tourne avant npm start, donc avant le health check du port 8080.
# next build doit finir ici : s'il reste dans prestart, le process n'écoute
# pas encore et le déploiement est coupé.
# On ne reconstruit pas si le standalone est déjà là (redémarrage).
# Ne jamais utiliser `prisma migrate dev` ici.
# L'add-on Clever injecte POSTGRESQL_ADDON_URI. La console n'interpole pas
# DATABASE_URL=$POSTGRESQL_ADDON_URI : on reprend l'URI réelle pour migrer.
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

if [ ! -f .next/standalone/server.js ]; then
  npm run build
fi
