FROM oven/bun:1.3.14-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./
COPY frontend/package.json ./frontend/package.json

RUN bun install


FROM oven/bun:1.3.14-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY package.json bun.lock ./
COPY frontend ./frontend

WORKDIR /app/frontend

ENV NEXT_TELEMETRY_DISABLED=1

RUN bun run build


FROM oven/bun:1.3.14-alpine AS runner

WORKDIR /app/frontend

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/frontend/.next ./.next
COPY --from=builder /app/frontend/public ./public
COPY --from=builder /app/frontend/package.json ./package.json
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["bun", "run", "start"]