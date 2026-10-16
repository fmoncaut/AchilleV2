#!/usr/bin/env bash
set -euo pipefail

# Clever Cloud n'a pas d'étape de build Node native.
# Ce hook tourne avant npm start, donc avant le health check du port 8080.
# next build doit finir ici : s'il reste dans prestart, le process n'écoute
# pas encore et le déploiement est coupé.
# Build TOUJOURS (déterministe) : un standalone en cache ne doit pas masquer
# un nouveau commit (OTP, branding, etc.).
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
# Même garde que les crons : un runtime Node différent de CC_NODE_VERSION
# doit faire échouer le déploiement, pas casser les crons en silence.
EXPECTED_NODE="${CC_NODE_VERSION:-22}"
NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "${NODE_MAJOR}" != "${EXPECTED_NODE}" ]; then
  echo "[pre-run] Node majeur ${NODE_MAJOR} != CC_NODE_VERSION ${EXPECTED_NODE} (voir engines dans package.json)." >&2
  exit 1
fi

npx prisma migrate deploy

# Un build normal prend ~1 min. Sans limite, un build figé bloque le
# déploiement ~30 min avant que Clever ne le coupe.
echo "[pre-run] next build (déterministe)"
if ! timeout --kill-after=30s 15m npm run build; then
  echo "[pre-run] next build a échoué ou dépassé 15 min." >&2
  exit 1
fi
