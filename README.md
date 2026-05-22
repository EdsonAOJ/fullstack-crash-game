# Crash Game — Full-stack Challenge

Crash Game implementation built for the Jungle Gaming full-stack challenge.

This project implements a distributed Crash Game backend using **NestJS**, **Bun**, **PostgreSQL**, **RabbitMQ**, **Kong**, **Keycloak**, **Prisma**, **DDD**, event-driven communication, transactional Outbox/Inbox, provably fair rounds, auto cashout, leaderboard, health checks, rate limiting, CI, and Docker Compose.

> **Note:** the backend and infrastructure were prioritized. The `frontend/` folder is present in the monorepo, but the main implemented scope is the backend, event-driven flows, infrastructure, and tests.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Implemented Features](#implemented-features)
- [Services and Ports](#services-and-ports)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Main API Endpoints](#main-api-endpoints)
- [Example Requests](#example-requests)
- [Game Flow](#game-flow)
- [Event-driven Communication](#event-driven-communication)
- [Transactional Outbox and Inbox](#transactional-outbox-and-inbox)
- [Provably Fair](#provably-fair)
- [Auto Cashout](#auto-cashout)
- [Leaderboard](#leaderboard)
- [Realtime Events](#realtime-events)
- [Health Checks](#health-checks)
- [Rate Limiting](#rate-limiting)
- [Testing](#testing)
- [CI Pipeline](#ci-pipeline)
- [Project Structure](#project-structure)
- [Design Decisions](#design-decisions)
- [Trade-offs and Future Improvements](#trade-offs-and-future-improvements)
- [Useful Commands](#useful-commands)
- [Final Notes](#final-notes)

---

## Overview

A Crash Game is a real-time betting game where a multiplier starts at `1.00x` and increases until it crashes. Players can place a bet before the round starts and must cash out before the crash to receive a payout.

This implementation models the system as two independent bounded contexts:

- **Game Service**: manages rounds, bets, game engine, crash logic, provably fair data, realtime notifications, auto cashout, and leaderboard.
- **Wallet Service**: manages player wallets, balance, credits, debits, and wallet transaction history.

The services communicate asynchronously through RabbitMQ using integration events.

---

## Architecture

```txt
                        ┌──────────────────────────┐
                        │        Frontend           │
                        │     Placeholder / UI      │
                        └─────┬────────────┬────────┘
                           HTTP/REST    WebSocket
                              │            │
                        ┌─────▼────────────▼────────┐
                        │           Kong             │
                        │        API Gateway         │
                        └─────┬────────────┬────────┘
                              │            │
                    ┌─────────▼──┐   ┌─────▼────────┐
                    │   Games    │   │   Wallets    │
                    │  Service   │   │   Service    │
                    │  NestJS    │   │   NestJS     │
                    └──┬─────┬───┘   └──────┬───────┘
                       │     │              │
                  ┌────▼────┐│         ┌────▼─────┐
                  │Postgres ││         │Postgres  │
                  │games DB ││         │wallets DB│
                  └─────────┘│         └──────────┘
                             │
                       ┌─────▼──────┐
                       │  RabbitMQ  │
                       │  Events    │
                       └────────────┘

              ┌─────────────────┐
              │    Keycloak     │
              │   OIDC / JWT    │
              └─────────────────┘
```

---

## Tech Stack

| Layer             | Technology                           |
| ----------------- | ------------------------------------ |
| Runtime           | Bun                                  |
| Backend           | NestJS + TypeScript                  |
| Database          | PostgreSQL                           |
| ORM               | Prisma                               |
| Messaging         | RabbitMQ                             |
| API Gateway       | Kong                                 |
| Identity Provider | Keycloak                             |
| Realtime          | Socket.IO / NestJS WebSocket Gateway |
| Validation        | Zod                                  |
| API Docs          | Swagger / OpenAPI                    |
| Tests             | Bun test runner                      |
| Containers        | Docker Compose                       |
| CI                | GitHub Actions                       |

---

## Implemented Features

### Core requirements

- Game round lifecycle:
  - `WAITING_FOR_BETS`
  - `RUNNING`
  - `CRASHED`
  - `COMPLETED`
- One bet per player per round.
- Manual cashout.
- Crash loss handling.
- Wallet debit/credit through asynchronous events.
- Insufficient balance rejection.
- Monetary values represented in integer cents / `BigInt`.
- JWT authentication through Keycloak.
- Kong API Gateway.
- RabbitMQ integration.
- PostgreSQL persistence.
- Unit tests and E2E tests.
- Docker Compose setup with no manual infrastructure steps.

### Extra features

- Transactional Outbox/Inbox.
- Idempotent event processing.
- Provably fair round verification.
- Auto cashout.
- Leaderboard.
- Kong rate limiting.
- Dependency-aware health checks.
- Deterministic seed for E2E.
- GitHub Actions CI.
- Smoke E2E separated from full E2E for faster validation.
- Swagger/OpenAPI documentation.

---

## Services and Ports

| Service             | Direct URL               | Kong URL                        |
| ------------------- | ------------------------ | ------------------------------- |
| Games Service       | `http://localhost:4001`  | `http://localhost:8000/games`   |
| Wallets Service     | `http://localhost:4002`  | `http://localhost:8000/wallets` |
| Kong Proxy          | `http://localhost:8000`  | —                               |
| Kong Admin          | `http://localhost:8001`  | —                               |
| Keycloak            | `http://localhost:8080`  | —                               |
| RabbitMQ Management | `http://localhost:15672` | —                               |
| PostgreSQL          | `localhost:5435`         | —                               |

---

## Quick Start

### Prerequisites

- Docker
- Docker Compose
- Bun

### Install dependencies

```bash
bun install
```

### Start the full stack

```bash
bun run docker:up
```

This starts:

- PostgreSQL
- RabbitMQ
- Keycloak
- Kong
- Games Service
- Wallets Service

The stack applies database migrations and seeds automatically.

### Stop containers

```bash
bun run docker:down
```

### Reset everything

```bash
bun run docker:prune
```

---

## Authentication

Keycloak is imported automatically through Docker Compose.

| Item          | Value                   |
| ------------- | ----------------------- |
| Realm         | `crash-game`            |
| Client ID     | `crash-game-client`     |
| Test user     | `player`                |
| Test password | `player123`             |
| Keycloak URL  | `http://localhost:8080` |

### Get an access token

```bash
TOKEN=$(curl -s \
  -X POST "http://localhost:8080/realms/crash-game/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=crash-game-client" \
  -d "grant_type=password" \
  -d "username=player" \
  -d "password=player123" | jq -r '.access_token')
```

---

## Main API Endpoints

All public calls should go through Kong:

```txt
http://localhost:8000
```

### Games

| Method | Endpoint                         | Auth | Description                      |
| ------ | -------------------------------- | ---- | -------------------------------- |
| `GET`  | `/games/health`                  | No   | Games service health check       |
| `GET`  | `/games/rounds/current`          | No   | Current round                    |
| `GET`  | `/games/rounds/latest`           | No   | Latest finished round            |
| `GET`  | `/games/rounds/history?limit=10` | No   | Rounds history                   |
| `GET`  | `/games/rounds/:roundId/verify`  | No   | Provably fair verification       |
| `GET`  | `/games/leaderboard?limit=10`    | No   | Player leaderboard               |
| `POST` | `/games/bet`                     | Yes  | Place a bet                      |
| `POST` | `/games/bet/cashout`             | Yes  | Manual cashout                   |
| `GET`  | `/games/bets/me`                 | Yes  | Current authenticated player bet |
| `GET`  | `/games/bets/:betId`             | Yes  | Bet by ID                        |

### Wallets

| Method | Endpoint          | Auth | Description                          |
| ------ | ----------------- | ---- | ------------------------------------ |
| `GET`  | `/wallets/health` | No   | Wallets service health check         |
| `POST` | `/wallets`        | Yes  | Create authenticated player's wallet |
| `GET`  | `/wallets/me`     | Yes  | Get authenticated player's wallet    |

---

## Example Requests

### Check current round

```bash
curl http://localhost:8000/games/rounds/current | jq
```

### Get wallet

```bash
curl http://localhost:8000/wallets/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Place a bet

```bash
curl -X POST http://localhost:8000/games/bet \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents":"1000"}' | jq
```

### Place a bet with auto cashout

```bash
curl -X POST http://localhost:8000/games/bet \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents":"1000","autoCashoutMultiplier":1.5}' | jq
```

### Manual cashout

```bash
curl -X POST http://localhost:8000/games/bet/cashout \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Leaderboard

```bash
curl "http://localhost:8000/games/leaderboard?limit=10" | jq
```

### Provably fair verification

```bash
curl "http://localhost:8000/games/rounds/<roundId>/verify" | jq
```

---

## Game Flow

### Bet placement

1. Player calls `POST /games/bet`.
2. Game Service creates a bet with status `PENDING_DEBIT`.
3. Game Service writes `wallet.debit.requested` to its Outbox.
4. Outbox publisher sends the event to RabbitMQ.
5. Wallet Service consumes the event.
6. Wallet Service debits the player wallet or rejects the debit.
7. Wallet Service writes a result event to its Outbox:
   - `wallet.debited`
   - `wallet.debit.rejected`
8. Game Service consumes the wallet result.
9. Bet becomes:
   - `ACCEPTED`, or
   - `REJECTED`.

### Manual cashout

1. Player calls `POST /games/bet/cashout`.
2. Game Service calculates payout:
   - `amountCents * currentMultiplier`
3. Bet becomes `CASHED_OUT_PENDING_CREDIT`.
4. Game Service emits `wallet.credit.requested`.
5. Wallet Service credits the wallet.
6. Wallet Service emits `wallet.credited`.
7. Game Service confirms the cashout.
8. Bet becomes `CASHED_OUT`.

### Crash loss

1. Round reaches crash point.
2. Game Service marks all accepted bets that did not cash out as `LOST`.
3. No wallet credit is emitted for lost bets.

---

## Event-driven Communication

Events are shared through the `@crash/events` package.

### Main wallet events

| Event                     | Producer | Consumer | Purpose                |
| ------------------------- | -------- | -------- | ---------------------- |
| `wallet.debit.requested`  | Games    | Wallets  | Request bet debit      |
| `wallet.debited`          | Wallets  | Games    | Confirm debit          |
| `wallet.debit.rejected`   | Wallets  | Games    | Reject debit           |
| `wallet.credit.requested` | Games    | Wallets  | Request cashout credit |
| `wallet.credited`         | Wallets  | Games    | Confirm credit         |
| `wallet.credit.rejected`  | Wallets  | Games    | Reject credit          |

---

## Transactional Outbox and Inbox

Both services use a transactional Outbox/Inbox strategy.

### Outbox

The service first stores domain changes and integration events in the same database transaction. A background publisher later reads pending events and publishes them to RabbitMQ.

This avoids the classic distributed systems failure:

```txt
database write succeeds
message publish fails
```

### Inbox / processed events

Consumers store processed event IDs in a `processed_events` table.

This provides idempotent processing and protects against duplicate delivery from RabbitMQ.

### Why this matters

RabbitMQ provides at-least-once delivery. Therefore, consumers must be idempotent. This project treats duplicated events as safe no-ops.

---

## Provably Fair

Each round stores:

- `serverSeed`
- `serverSeedHash`
- `publicSeed`
- `nonce`
- `crashPointMultiplier`

Before a round is completed, the API exposes only non-sensitive verification data, such as the `serverSeedHash`.

After the round is completed, the API reveals the `serverSeed`, allowing the player to independently verify:

- the hash is valid
- the crash point was predetermined
- the result was not manipulated after bets were placed

Endpoint:

```txt
GET /games/rounds/:roundId/verify
```

---

## Auto Cashout

Players can provide an optional `autoCashoutMultiplier` when placing a bet.

Example:

```json
{
  "amountCents": "1000",
  "autoCashoutMultiplier": 1.5
}
```

When the running round reaches the target multiplier:

1. Game engine detects eligible accepted bets.
2. Bet is moved to `CASHED_OUT_PENDING_CREDIT`.
3. Game Service stores a `wallet.credit.requested` event in the Outbox.
4. Wallet Service credits the player.
5. Game Service confirms the wallet result.
6. Bet becomes `CASHED_OUT`.

This is implemented in the game engine without exposing another REST action.

---

## Leaderboard

The leaderboard ranks players by profit using completed bets.

Endpoint:

```txt
GET /games/leaderboard?limit=10
```

Response shape:

```json
{
  "items": [
    {
      "playerId": "player",
      "betsCount": 5,
      "cashoutsCount": 2,
      "lostBetsCount": 3,
      "totalWageredCents": "5000",
      "totalPayoutCents": "7200",
      "totalProfitCents": "2200"
    }
  ]
}
```

Only finalized bets are considered:

- `CASHED_OUT`
- `LOST`

Pending or rejected bets are ignored.

---

## Realtime Events

The Game Service exposes a WebSocket gateway under the `/games` namespace.

Server-side events include:

| Event                      | Description           |
| -------------------------- | --------------------- |
| `connection.ready`         | Client connected      |
| `round.created`            | New round created     |
| `round.started`            | Round started         |
| `round.multiplier.updated` | Multiplier changed    |
| `round.crashed`            | Round crashed         |
| `round.completed`          | Round completed       |
| `bet.placed`               | Bet placed            |
| `bet.accepted`             | Wallet debit accepted |
| `bet.rejected`             | Wallet debit rejected |
| `bet.cashed_out`           | Bet cashed out        |

Player actions are still performed through REST. WebSocket is used for server-to-client synchronization.

---

## Health Checks

Both services expose dependency-aware health endpoints.

```bash
curl http://localhost:8000/games/health | jq
curl http://localhost:8000/wallets/health | jq
```

Example response:

```json
{
  "status": "ok",
  "service": "games",
  "checks": {
    "database": "ok",
    "rabbitmq": "ok"
  }
}
```

The health check validates:

- service availability
- PostgreSQL connectivity
- RabbitMQ connectivity

---

## Rate Limiting

Kong applies rate limiting to protect the API.

State-changing operations such as bet placement, cashout, and wallet creation can be protected with stricter route-level limits.

The configuration is defined in:

```txt
docker/kong/kong.yml
```

---

## Testing

### Root validation

Run the main validation command from the repository root:

```bash
bun run check
```

This runs:

- Games typecheck
- Games lint
- Games unit tests
- Games smoke E2E
- Wallets typecheck
- Wallets lint
- Wallets unit tests
- Wallets E2E

### Games

```bash
cd services/games

bun run typecheck
bun run lint
bun test tests/unit
bun run test:e2e
```

### Games full E2E

The full gameplay E2E suite is available but intentionally not part of the default validation because it depends on real game-engine timing and can take longer.

```bash
cd services/games

bun run test:e2e:full
```

### Wallets

```bash
cd services/wallets

bun run typecheck
bun run lint
bun test tests/unit
bun test tests/e2e
```

---

## CI Pipeline

GitHub Actions runs on push and pull request.

The CI validates:

- dependency installation
- Prisma client generation
- typecheck
- lint
- unit tests
- Docker stack startup
- health checks
- E2E smoke tests

The pipeline is defined in:

```txt
.github/workflows/ci.yml
```

---

## Project Structure

```txt
fullstack-challenge/
├── docker/
│   ├── keycloak/
│   └── kong/
├── frontend/
├── packages/
│   └── events/
├── services/
│   ├── games/
│   │   ├── prisma/
│   │   ├── src/
│   │   │   ├── application/
│   │   │   ├── domain/
│   │   │   ├── infrastructure/
│   │   │   └── presentation/
│   │   └── tests/
│   │       ├── unit/
│   │       └── e2e/
│   └── wallets/
│       ├── prisma/
│       ├── src/
│       │   ├── application/
│       │   ├── domain/
│       │   ├── infrastructure/
│       │   └── presentation/
│       └── tests/
│           ├── unit/
│           └── e2e/
├── docker-compose.yml
├── package.json
└── README.md
```

---

## Design Decisions

### DDD and bounded contexts

Game and Wallet were separated because they represent different business capabilities:

- Game owns rounds, bets, crash logic, and fair verification.
- Wallet owns balance, debits, credits, and monetary consistency.

This keeps domain rules isolated and avoids direct database coupling between services.

### Asynchronous consistency

Wallet operations are asynchronous. A bet starts as `PENDING_DEBIT` and only becomes `ACCEPTED` when the Wallet Service confirms the debit.

This models a more realistic distributed system and avoids synchronous cross-service coupling.

### Monetary precision

All monetary values are stored as integer cents using `BigInt`. No floating-point arithmetic is used for wallet balances.

### Outbox/Inbox

Outbox guarantees event persistence with domain changes. Inbox guarantees idempotent consumption.

### Smoke vs full E2E

The real game engine is time-based and probabilistic. Full E2E tests are useful, but they can be slow and flaky if executed on every CI run.

For this reason:

- Smoke E2E is used in the default validation path.
- Full E2E remains available for deeper manual validation.

---

## Trade-offs and Future Improvements

### Frontend

The frontend was not completed. The backend and infrastructure were prioritized to demonstrate distributed systems design, event-driven communication, resiliency, and core gameplay correctness.

Future frontend work:

- authenticated login with Keycloak
- game screen with multiplier animation
- current round bets
- wallet balance
- manual cashout button
- auto cashout input
- leaderboard UI
- provably fair verification page

### Auto Bet

Auto Bet was not implemented because it would require additional player strategy state and scheduled bet creation on every new round.

A safe implementation would need:

- strategy configuration per player
- idempotent bet creation per round
- stop-loss controls
- safeguards against repeated automatic debits

### Observability

The project has health checks and structured lifecycle logs, but not full OpenTelemetry.

Future observability work:

- OpenTelemetry traces
- Prometheus metrics
- Grafana dashboard
- RabbitMQ event latency metrics
- RTP and betting volume metrics

### Leaderboard window

The current leaderboard is global. It can be extended to support time windows:

- 24h
- 7d
- all-time

### Full E2E stability

The full gameplay E2E suite can be improved further by introducing deterministic test-only round generation or a controllable game engine clock.

---

## Useful Commands

```bash
# Start full stack
bun run docker:up

# Stop stack
bun run docker:down

# Reset stack
bun run docker:prune

# Validate everything
bun run check

# Tail logs
bun run docker:logs

# Check containers
bun run docker:ps
```

---

## Final Notes

This implementation focuses on backend architecture, domain modeling, event-driven consistency, idempotency, and operational reliability.

The most important technical choices were:

- separate bounded contexts
- asynchronous wallet settlement
- transactional Outbox/Inbox
- integer-based monetary arithmetic
- provably fair verification
- API Gateway protection
- fast smoke E2E for CI
- full E2E available for deeper validation
