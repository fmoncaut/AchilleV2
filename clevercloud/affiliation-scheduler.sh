#!/bin/bash -l
# Clever Cloud cron wrapper — charge l'env (bash -l), instance 0 seulement.
set -euo pipefail

if [[ "${INSTANCE_NUMBER:-0}" != "0" ]]; then
  echo "Instance number is ${INSTANCE_NUMBER}. Stop here."
  exit 0
fi

cd "${APP_HOME}"

# Même majeur Node que CC_NODE_VERSION (défaut 22, cf. docs/deployment.md).
EXPECTED="${CC_NODE_VERSION:-22}"
MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [[ "${MAJOR}" != "${EXPECTED}" ]]; then
  echo "Node majeur ${MAJOR} != CC_NODE_VERSION ${EXPECTED}" >&2
  exit 1
fi

exec npx tsx scripts/affiliation-scheduler.ts
