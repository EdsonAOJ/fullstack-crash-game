FROM oven/bun:1.3.14 AS base

WORKDIR /app

COPY package.json bun.lock* ./
COPY packages ./packages
COPY frontend/package.json ./frontend/package.json
COPY services/games/package.json ./services/games/package.json
COPY services/wallets/package.json ./services/wallets/package.json
COPY services/games/prisma ./services/games/prisma

RUN bun install --frozen-lockfile

WORKDIR /app/services/games

RUN bunx prisma generate --schema prisma/schema.prisma


FROM base AS quality

WORKDIR /app/services/games

COPY services/games/tsconfig.json ./tsconfig.json
COPY services/games/src ./src
COPY services/games/tests ./tests

RUN bun run typecheck

RUN mkdir -p /tmp/build-quality && touch /tmp/build-quality/typecheck-passed


FROM base AS runtime

WORKDIR /app/services/games

ENV NODE_ENV=production

COPY --from=quality /tmp/build-quality/typecheck-passed /tmp/build-quality/typecheck-passed
COPY services/games/tsconfig.json ./tsconfig.json
COPY services/games/src ./src
COPY services/games/prisma ./prisma
COPY services/games/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

EXPOSE 4001

ENTRYPOINT ["./docker-entrypoint.sh"]