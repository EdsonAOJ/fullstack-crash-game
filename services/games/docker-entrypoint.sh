#!/bin/sh
set -e

echo "Running Games database migrations..."
bunx prisma migrate deploy --schema prisma/schema.prisma

echo "Running Games seed..."
bun run prisma:seed

echo "Starting Games service..."
bun run src/main.ts