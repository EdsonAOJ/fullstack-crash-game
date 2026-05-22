#!/bin/sh
set -e

echo "Running Wallets database migrations..."
bunx prisma migrate deploy --schema prisma/schema.prisma

echo "Running Wallets seed..."
bun run prisma:seed

echo "Starting Wallets service..."
bun run src/main.ts