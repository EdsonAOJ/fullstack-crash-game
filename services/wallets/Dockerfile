FROM oven/bun:1.3.14 AS base

WORKDIR /app

COPY package.json bun.lock* ./
COPY packages ./packages
COPY frontend/package.json ./frontend/package.json
COPY services/wallets/package.json ./services/wallets/package.json
COPY services/wallets/prisma ./services/wallets/prisma

RUN bun install --frozen-lockfile || bun install

WORKDIR /app/services/wallets

RUN bunx prisma generate --schema prisma/schema.prisma


FROM base AS quality

WORKDIR /app/services/wallets

COPY services/wallets/tsconfig.json ./tsconfig.json
COPY services/wallets/src ./src
COPY services/wallets/tests ./tests

RUN bun run typecheck
RUN mkdir -p /tmp/build-quality && touch /tmp/build-quality/typecheck-passed


FROM base AS runtime

WORKDIR /app/services/wallets

COPY --from=quality /tmp/build-quality/typecheck-passed /tmp/build-quality/typecheck-passed

COPY services/wallets/tsconfig.json ./tsconfig.json
COPY services/wallets/src ./src
COPY services/wallets/prisma ./prisma
COPY services/wallets/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4002

CMD ["./docker-entrypoint.sh"]