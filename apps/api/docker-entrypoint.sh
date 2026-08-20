#!/bin/sh
set -e

# Generated at build time, not here: the generator emits TypeScript and there is
# no src/ in this image to emit into.
if [ ! -f dist/generated/prisma/client.js ]; then
  echo "[entrypoint] FATAL: generated Prisma client missing from the image."
  echo "[entrypoint] Rebuild with: docker compose build --no-cache api"
  exit 1
fi

echo "[entrypoint] applying migrations…"
./node_modules/.bin/prisma migrate deploy

if [ "${SEED_ON_START}" = "true" ]; then
  echo "[entrypoint] seeding…"
  node dist/seed.js
fi

echo "[entrypoint] starting API"
exec "$@"
