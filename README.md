# Fullstack Crash Game

Aplicação full-stack de um jogo estilo **Crash**, construída com arquitetura orientada a eventos, autenticação via Keycloak, comunicação em tempo real via WebSocket, carteira transacional e validação Provably Fair.

O projeto foi desenvolvido para rodar localmente com um único comando:

```bash
bun run docker:up
```

---

## Stack principal

### Backend

- Bun
- TypeScript
- NestJS
- Prisma
- PostgreSQL
- RabbitMQ
- Kong API Gateway
- Keycloak
- WebSocket
- Docker Compose

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- TanStack Query
- React Context
- Socket.IO Client
- Sonner Toasts
- Keycloak OIDC Authorization Code Flow com PKCE

---

## Visão geral da arquitetura

O projeto é dividido em serviços independentes:

```txt
Frontend Next.js
    |
    | HTTP interno via /api/proxy
    v
Kong API Gateway
    |
    |--------------------|
    v                    v
Games Service        Wallets Service
    |                    |
    | RabbitMQ           | RabbitMQ
    |--------------------|
    v
PostgreSQL
```

### Serviços

| Serviço    | Responsabilidade                                                                 |
| ---------- | -------------------------------------------------------------------------------- |
| `frontend` | Interface do jogo, login, dashboard, apostas, cashout, histórico e leaderboard   |
| `games`    | Motor do jogo, rodadas, apostas, cashout, leaderboard, Provably Fair e WebSocket |
| `wallets`  | Carteiras, saldo, débitos, créditos e idempotência financeira                    |
| `kong`     | API Gateway para rotear chamadas públicas                                        |
| `keycloak` | Identity Provider com OIDC                                                       |
| `postgres` | Banco de dados dos serviços                                                      |
| `rabbitmq` | Mensageria entre Games e Wallets                                                 |

---

## Principais funcionalidades

- Login real com Keycloak usando OIDC Authorization Code Flow com PKCE
- Tokens armazenados em cookies `httpOnly`
- Proxy interno no Next.js que injeta `Authorization: Bearer` automaticamente
- Dashboard em tempo real com WebSocket
- Rodadas com fase de apostas, execução, crash e finalização
- Apostas manuais
- Cashout manual
- Auto cashout
- Carteira transacional por jogador
- Comunicação assíncrona entre Games e Wallets via RabbitMQ
- Outbox Pattern para publicação confiável de eventos
- Inbox/Processed Events para idempotência
- Provably Fair com `serverSeedHash`, `serverSeed`, `publicSeed`, `nonce` e verificação da rodada
- Leaderboard
- Histórico de rodadas
- Histórico individual de apostas
- Setup multiusuário demo
- Docker Compose com healthchecks

---

## Como rodar o projeto

### Requisitos

Instale previamente:

- Docker
- Docker Compose
- Bun

Versão usada no projeto:

```txt
Bun 1.3.14
```

---

## Subir a stack completa

Na raiz do projeto:

```bash
bun install
bun run docker:up
```

Esse comando sobe:

- PostgreSQL
- RabbitMQ
- Keycloak
- Games Service
- Wallets Service
- Kong
- Frontend

Depois acesse:

```txt
http://localhost:3000
```

ou diretamente:

```txt
http://localhost:3000/login
```

---

## Usuários demo

O ambiente Docker já sobe com usuários demo no Keycloak e carteiras iniciais no Wallets Service.

| Username  | Password    |
| --------- | ----------- |
| `player`  | `player123` |
| `player2` | `player123` |
| `player3` | `player123` |

Para testar múltiplos usuários ao mesmo tempo, use sessões separadas:

```txt
Chrome normal: player
Chrome anônimo: player2
Firefox/outro perfil: player3
```

Isso é necessário porque a autenticação usa cookies `httpOnly` no domínio `localhost:3000`.

---

## URLs principais

| Recurso              | URL                             |
| -------------------- | ------------------------------- |
| Frontend             | `http://localhost:3000`         |
| Login                | `http://localhost:3000/login`   |
| Kong Gateway         | `http://localhost:8000`         |
| Games API via Kong   | `http://localhost:8000/games`   |
| Wallets API via Kong | `http://localhost:8000/wallets` |
| Games Swagger        | `http://localhost:4001/docs`    |
| Wallets Swagger      | `http://localhost:4002/docs`    |
| Keycloak             | `http://localhost:8080`         |
| RabbitMQ Management  | `http://localhost:15672`        |
| Kong Admin           | `http://localhost:8001`         |

Credenciais do RabbitMQ:

| Campo    | Valor   |
| -------- | ------- |
| Username | `admin` |
| Password | `admin` |

Credenciais do Keycloak Admin:

| Campo    | Valor   |
| -------- | ------- |
| Username | `admin` |
| Password | `admin` |

---

## Como validar rapidamente

Depois de subir a stack:

```bash
docker compose ps
```

Valide os healthchecks:

```bash
curl http://localhost:8000/games/health | jq
curl http://localhost:8000/wallets/health | jq
curl -I http://localhost:3000
```

Valide usuários e carteiras:

```bash
for USER in player player2 player3; do
  TOKEN=$(curl -s \
    -X POST "http://localhost:8080/realms/crash-game/protocol/openid-connect/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=crash-game-client" \
    -d "grant_type=password" \
    -d "username=$USER" \
    -d "password=player123" | jq -r '.access_token')

  echo "---- $USER ----"

  curl -s http://localhost:8000/wallets/me \
    -H "Authorization: Bearer $TOKEN" | jq
done
```

---

## Checklist manual da interface

Após acessar `http://localhost:3000/login`:

1. Clicar em **Entrar com Keycloak**
2. Fazer login com um dos usuários demo
3. Ser redirecionado para `/`
4. Ver status de autenticação como autenticado
5. Ver carteira carregada
6. Ver rodada atual
7. Fazer uma aposta durante a fase de apostas
8. Fazer cashout durante a rodada
9. Testar auto cashout
10. Ver atualização do histórico individual
11. Ver atualização do leaderboard
12. Ver apostas da rodada atual em tempo real
13. Ver histórico de rodadas
14. Ver painel Provably Fair para rodada finalizada

---

## Comandos úteis

### Subir tudo

```bash
bun run docker:up
```

### Parar containers

```bash
docker compose down
```

### Limpar volumes e containers

```bash
bun run docker:prune
```

### Rodar validação completa

```bash
bun run check:all
```

### Validar somente backend

```bash
bun run check
```

### Validar somente Games

```bash
bun run check:games
```

### Validar somente Wallets

```bash
bun run check:wallets
```

### Validar somente Frontend

```bash
bun run check:frontend
```

---

## Testes

O projeto possui testes unitários e E2E/smoke.

### Games Service

```bash
cd services/games

bun run typecheck
bun run lint
bun test tests/unit
bun run test:e2e
```

### Wallets Service

```bash
cd services/wallets

bun run typecheck
bun run lint
bun test tests/unit
bun run test:e2e
```

### Frontend

```bash
cd frontend

bun run lint
bun run build
```

### Validação completa

Na raiz:

```bash
bun run check:all
```

---

## Configuração de ambiente

A configuração do Docker é centralizada no `docker-compose.yml`.

### Regra adotada

```txt
Docker/entrega:
  usa docker-compose.yml

Desenvolvimento local:
  pode usar .env.local

.env.example:
  serve apenas como documentação/modelo
```

### Importante

No Docker, os serviços usam nomes internos da rede:

```txt
postgres
rabbitmq
keycloak
kong
```

Exemplo:

```txt
KONG_URL=http://kong:8000
KEYCLOAK_TOKEN_URL=http://keycloak:8080/realms/crash-game/protocol/openid-connect/token
```

No navegador, as URLs públicas usam `localhost`:

```txt
APP_PUBLIC_URL=http://localhost:3000
KEYCLOAK_AUTHORIZATION_URL=http://localhost:8080/realms/crash-game/protocol/openid-connect/auth
KEYCLOAK_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

`0.0.0.0` é usado apenas para bind interno do servidor dentro do container. Não deve ser usado como URL pública no browser ou no redirect URI do Keycloak.

---

## Fluxo de autenticação

O frontend implementa OIDC Authorization Code Flow com PKCE.

Fluxo:

```txt
/login
  ↓
/api/auth/login
  ↓
Keycloak Authorization Endpoint
  ↓
/api/auth/callback
  ↓
troca code por token
  ↓
salva tokens em cookies httpOnly
  ↓
redireciona para /
```

Rotas de autenticação no Next.js:

| Rota                 | Responsabilidade                                 |
| -------------------- | ------------------------------------------------ |
| `/api/auth/login`    | Gera state/PKCE e redireciona para Keycloak      |
| `/api/auth/callback` | Valida state, troca code por token e cria sessão |
| `/api/auth/session`  | Retorna usuário autenticado                      |
| `/api/auth/logout`   | Limpa cookies de autenticação                    |

O browser não acessa diretamente o access token. As chamadas protegidas passam pelo proxy interno:

```txt
/api/proxy/[...path]
```

Esse proxy lê o cookie `httpOnly` e injeta:

```http
Authorization: Bearer <access_token>
```

---

## Gerenciamento de estado no Frontend

O frontend usa:

| Tipo de estado                | Solução        |
| ----------------------------- | -------------- |
| Server state                  | TanStack Query |
| Auth/client state             | React Context  |
| Estado local de formulário/UI | `useState`     |

Dados controlados por TanStack Query:

- Rodada atual
- Carteira
- Leaderboard
- Histórico de rodadas
- Histórico de apostas do jogador
- Verificação Provably Fair

Após ações como aposta, cashout ou eventos WebSocket, as queries são invalidadas para manter a interface sincronizada.

---

## WebSocket

O Games Service emite eventos de rodada e apostas em tempo real.

O frontend se conecta em:

```txt
http://localhost:4001/games
```

Ações do jogador continuam sendo feitas por REST:

- Criar aposta
- Solicitar cashout
- Consultar carteira
- Consultar histórico

O WebSocket é usado para push de atualizações do servidor para os clientes.

---

## Regras principais do jogo

- A rodada começa em `WAITING_FOR_BETS`
- Após a janela de apostas, muda para `RUNNING`
- O multiplicador cresce ao longo do tempo
- O jogador pode fazer cashout enquanto a rodada está em execução
- Auto cashout executa automaticamente quando o multiplicador configurado é atingido
- Quando o multiplicador atinge o crash point, a rodada muda para `CRASHED`
- Depois de um pequeno intervalo de revelação, a rodada muda para `COMPLETED`
- O crash point não é exposto antes da revelação da rodada

Configuração atual do motor:

```txt
GAME_ENGINE_TICK_MS=100
GAME_BETTING_WINDOW_MS=5000
GAME_CRASH_REVEAL_MS=2000
GAME_MULTIPLIER_GROWTH_PER_SECOND=0.1
GAME_MAX_CRASH_MULTIPLIER=20
```

---

## Provably Fair

Cada rodada possui dados criptográficos para verificação:

- `serverSeed`
- `serverSeedHash`
- `publicSeed`
- `nonce`
- `crashPoint`

Antes da rodada finalizar, o backend não expõe o `serverSeed` nem o `crashPoint`.

Após a rodada ser revelada, é possível verificar se:

1. O hash do server seed é válido
2. O crash point calculado bate com o crash point da rodada

Endpoint:

```txt
GET /games/rounds/:roundId/verify
```

---

## Comunicação entre Games e Wallets

A comunicação financeira entre os serviços é assíncrona via RabbitMQ.

### Fluxo de aposta

```txt
1. Frontend solicita aposta
2. Games cria aposta pendente
3. Games publica wallet.debit.requested
4. Wallets processa débito
5. Wallets publica wallet.debited ou wallet.debit.rejected
6. Games confirma ou rejeita a aposta
```

### Fluxo de cashout

```txt
1. Frontend solicita cashout
2. Games marca aposta como CASHED_OUT_PENDING_CREDIT
3. Games publica wallet.credit.requested
4. Wallets processa crédito
5. Wallets publica wallet.credited
6. Games marca aposta como CASHED_OUT
```

---

## Outbox e idempotência

O projeto usa Outbox Pattern para evitar perda de eventos.

### Games

Publica eventos como:

- `wallet.debit.requested`
- `wallet.credit.requested`

### Wallets

Publica eventos como:

- `wallet.debited`
- `wallet.debit.rejected`
- `wallet.credited`
- `wallet.credit.rejected`

Cada serviço também possui tabela de eventos processados para evitar reprocessamento duplicado.

Isso torna o fluxo mais resiliente contra:

- Reentrega de mensagens
- Falhas temporárias no RabbitMQ
- Processamento duplicado
- Eventos assíncronos chegando após a rodada mudar

---

## Banco de dados

O PostgreSQL sobe com dois bancos:

```txt
games
wallets
```

A porta exposta localmente é:

```txt
localhost:5435
```

Credenciais:

```txt
user: admin
password: admin
database: postgres
```

---

## Consultas úteis

### Ver apostas pendentes de crédito no Games

```bash
docker compose exec postgres psql -U admin -d games -c '
select
  id,
  "roundId",
  "playerId",
  status,
  "cashoutMultiplier",
  "payoutCents",
  "updatedAt"
from bets
where status = '\''CASHED_OUT_PENDING_CREDIT'\''
order by "updatedAt" desc;
'
```

O esperado, em estado saudável, é retornar zero linhas após os eventos de crédito serem processados.

### Ver outbox do Games

```bash
docker compose exec postgres psql -U admin -d games -c '
select
  id,
  "eventId",
  "eventName",
  status,
  attempts,
  "lastError",
  "createdAt",
  "publishedAt"
from outbox_events
order by "createdAt" desc
limit 20;
'
```

### Ver outbox do Wallets

```bash
docker compose exec postgres psql -U admin -d wallets -c '
select
  id,
  "eventId",
  "eventName",
  status,
  attempts,
  "lastError",
  "createdAt",
  "publishedAt"
from outbox_events
order by "createdAt" desc
limit 20;
'
```

### Ver transações financeiras

```bash
docker compose exec postgres psql -U admin -d wallets -c '
select
  id,
  "walletId",
  "eventId",
  type,
  "amountCents",
  "balanceBefore",
  "balanceAfter",
  "referenceType",
  "referenceId",
  "createdAt"
from wallet_transactions
order by "createdAt" desc
limit 20;
'
```

---

## Desenvolvimento local

Para rodar o frontend fora do Docker:

```bash
cd frontend
bun install
bun run dev
```

Nesse caso, use `frontend/.env.local` com URLs apontando para `localhost`.

Exemplo:

```env
APP_PUBLIC_URL=http://localhost:3000
KONG_URL=http://localhost:8000
KEYCLOAK_AUTHORIZATION_URL=http://localhost:8080/realms/crash-game/protocol/openid-connect/auth
KEYCLOAK_TOKEN_URL=http://localhost:8080/realms/crash-game/protocol/openid-connect/token
KEYCLOAK_CLIENT_ID=crash-game-client
KEYCLOAK_REDIRECT_URI=http://localhost:3000/api/auth/callback
NEXT_PUBLIC_GAMES_SOCKET_URL=http://localhost:4001/games
NEXT_TELEMETRY_DISABLED=1
```

---

## Scripts principais

| Script                   | Descrição                                 |
| ------------------------ | ----------------------------------------- |
| `bun run docker:up`      | Sobe a stack completa                     |
| `bun run docker:prune`   | Remove containers, volumes e estado local |
| `bun run check:games`    | Typecheck, lint, unit e E2E do Games      |
| `bun run check:wallets`  | Typecheck, lint, unit e E2E do Wallets    |
| `bun run check:frontend` | Lint e build do Frontend                  |
| `bun run check`          | Validação dos backends                    |
| `bun run check:all`      | Validação completa do projeto             |

---

## Observações técnicas

### Prisma em monorepo

O projeto possui dois schemas Prisma:

```txt
services/games/prisma/schema.prisma
services/wallets/prisma/schema.prisma
```

Como ambos usam `@prisma/client`, os scripts de check geram o Prisma Client correto imediatamente antes de validar cada serviço.

Isso evita que o client gerado para Wallets sobrescreva o client esperado pelo Games durante validações locais.

---

## Troubleshooting

### `tsc: command not found`

Provavelmente `node_modules` foi removido.

Rode:

```bash
bun install
bun run check:all
```

### Prisma Client sem models esperados

Exemplo:

```txt
Property 'round' does not exist on type PrismaClient
```

Rode:

```bash
bun run check:all
```

Os scripts geram o client correto antes de validar cada serviço.

### Login redirecionando para `0.0.0.0`

Use sempre:

```txt
http://localhost:3000/login
```

`0.0.0.0` é apenas bind interno do container, não URL pública.

Confirme:

```bash
docker compose exec frontend printenv | grep -E "APP_PUBLIC_URL|KEYCLOAK_REDIRECT_URI"
```

Esperado:

```txt
APP_PUBLIC_URL=http://localhost:3000
KEYCLOAK_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

### Aposta presa em `CASHED_OUT_PENDING_CREDIT`

Verifique:

```bash
docker compose exec postgres psql -U admin -d games -c '
select
  id,
  "roundId",
  "playerId",
  status,
  "cashoutMultiplier",
  "payoutCents",
  "updatedAt"
from bets
where status = '\''CASHED_OUT_PENDING_CREDIT'\''
order by "updatedAt" desc;
'
```

Em fluxo saudável, a aposta deve sair desse status após o Wallets publicar `wallet.credited` e o Games processar o evento.

---

## Estado final esperado

Após rodar:

```bash
bun install
bun run docker:up
bun run check:all
```

O projeto deve estar com:

- Frontend acessível em `localhost:3000`
- Login Keycloak funcional
- Games Service saudável
- Wallets Service saudável
- Kong roteando APIs
- RabbitMQ operacional
- PostgreSQL com bancos `games` e `wallets`
- Usuários demo disponíveis
- Carteiras demo disponíveis
- Testes unitários passando
- Testes E2E/smoke passando
- Build do frontend passando
