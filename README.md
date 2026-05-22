# Crash Game — Desafio Full-stack

Implementação de um Crash Game para o desafio full-stack da Jungle Gaming.

Este projeto implementa um backend distribuído para um Crash Game usando **NestJS**, **Bun**, **PostgreSQL**, **RabbitMQ**, **Kong**, **Keycloak**, **Prisma**, **DDD**, comunicação orientada a eventos, Outbox/Inbox transacional, rodadas provably fair, auto cashout, leaderboard, health checks, rate limiting, CI e Docker Compose.

> **Observação:** o backend e a infraestrutura foram priorizados. A pasta `frontend/` existe no monorepo, mas o escopo principal implementado foi backend, fluxos event-driven, infraestrutura e testes.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Stack Técnica](#stack-técnica)
- [Funcionalidades Implementadas](#funcionalidades-implementadas)
- [Serviços e Portas](#serviços-e-portas)
- [Como Rodar](#como-rodar)
- [Autenticação](#autenticação)
- [Principais Endpoints](#principais-endpoints)
- [Exemplos de Requisições](#exemplos-de-requisições)
- [Fluxo do Jogo](#fluxo-do-jogo)
- [Comunicação Orientada a Eventos](#comunicação-orientada-a-eventos)
- [Outbox e Inbox Transacional](#outbox-e-inbox-transacional)
- [Provably Fair](#provably-fair)
- [Auto Cashout](#auto-cashout)
- [Leaderboard](#leaderboard)
- [Eventos em Tempo Real](#eventos-em-tempo-real)
- [Health Checks](#health-checks)
- [Rate Limiting](#rate-limiting)
- [Testes](#testes)
- [Pipeline de CI](#pipeline-de-ci)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Decisões Técnicas](#decisões-técnicas)
- [Trade-offs e Melhorias Futuras](#trade-offs-e-melhorias-futuras)
- [Comandos Úteis](#comandos-úteis)
- [Notas Finais](#notas-finais)

---

## Visão Geral

Um Crash Game é um jogo de apostas em tempo real no qual um multiplicador começa em `1.00x` e aumenta até crashar. O jogador pode apostar antes da rodada começar e precisa sacar antes do crash para receber o pagamento.

Esta implementação modela o sistema como dois bounded contexts independentes:

- **Game Service**: gerencia rodadas, apostas, engine do jogo, lógica de crash, dados provably fair, notificações em tempo real, auto cashout e leaderboard.
- **Wallet Service**: gerencia carteiras dos jogadores, saldo, créditos, débitos e histórico de transações.

Os serviços se comunicam de forma assíncrona via RabbitMQ usando eventos de integração.

---

## Arquitetura

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

## Stack Técnica

| Camada              | Tecnologia                           |
| ------------------- | ------------------------------------ |
| Runtime             | Bun                                  |
| Backend             | NestJS + TypeScript                  |
| Banco de dados      | PostgreSQL                           |
| ORM                 | Prisma                               |
| Mensageria          | RabbitMQ                             |
| API Gateway         | Kong                                 |
| Identity Provider   | Keycloak                             |
| Tempo real          | Socket.IO / NestJS WebSocket Gateway |
| Validação           | Zod                                  |
| Documentação de API | Swagger / OpenAPI                    |
| Testes              | Bun test runner                      |
| Containers          | Docker Compose                       |
| CI                  | GitHub Actions                       |

---

## Funcionalidades Implementadas

### Requisitos principais

- Ciclo de vida da rodada:
  - `WAITING_FOR_BETS`
  - `RUNNING`
  - `CRASHED`
  - `COMPLETED`
- Uma aposta por jogador por rodada.
- Cashout manual.
- Tratamento de perda no crash.
- Débito e crédito de carteira via eventos assíncronos.
- Rejeição por saldo insuficiente.
- Valores monetários representados em centavos inteiros / `BigInt`.
- Autenticação JWT via Keycloak.
- API Gateway com Kong.
- Integração com RabbitMQ.
- Persistência com PostgreSQL.
- Testes unitários e E2E.
- Docker Compose sem passos manuais de infraestrutura.

### Extras implementados

- Outbox/Inbox transacional.
- Processamento idempotente de eventos.
- Verificação provably fair.
- Auto cashout.
- Leaderboard.
- Rate limiting via Kong.
- Health checks com dependências reais.
- Seed determinística para E2E.
- CI com GitHub Actions.
- Smoke E2E separado do Full E2E para validação rápida.
- Swagger/OpenAPI.

---

## Serviços e Portas

| Serviço             | URL direta               | URL via Kong                    |
| ------------------- | ------------------------ | ------------------------------- |
| Games Service       | `http://localhost:4001`  | `http://localhost:8000/games`   |
| Wallets Service     | `http://localhost:4002`  | `http://localhost:8000/wallets` |
| Kong Proxy          | `http://localhost:8000`  | —                               |
| Kong Admin          | `http://localhost:8001`  | —                               |
| Keycloak            | `http://localhost:8080`  | —                               |
| RabbitMQ Management | `http://localhost:15672` | —                               |
| PostgreSQL          | `localhost:5435`         | —                               |

---

## Como Rodar

### Pré-requisitos

- Docker
- Docker Compose
- Bun

### Instalar dependências

```bash
bun install
```

### Subir a stack completa

```bash
bun run docker:up
```

Esse comando sobe:

- PostgreSQL
- RabbitMQ
- Keycloak
- Kong
- Games Service
- Wallets Service

A stack aplica migrations e seeds automaticamente.

### Parar containers

```bash
bun run docker:down
```

### Resetar tudo

```bash
bun run docker:prune
```

---

## Autenticação

O Keycloak é importado automaticamente pelo Docker Compose.

| Item             | Valor                   |
| ---------------- | ----------------------- |
| Realm            | `crash-game`            |
| Client ID        | `crash-game-client`     |
| Usuário de teste | `player`                |
| Senha            | `player123`             |
| Keycloak URL     | `http://localhost:8080` |

### Obter access token

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

## Principais Endpoints

Todas as chamadas públicas devem passar pelo Kong:

```txt
http://localhost:8000
```

### Games

| Método | Endpoint                         | Auth | Descrição                           |
| ------ | -------------------------------- | ---- | ----------------------------------- |
| `GET`  | `/games/health`                  | Não  | Health check do Games               |
| `GET`  | `/games/rounds/current`          | Não  | Rodada atual                        |
| `GET`  | `/games/rounds/latest`           | Não  | Última rodada finalizada            |
| `GET`  | `/games/rounds/history?limit=10` | Não  | Histórico de rodadas                |
| `GET`  | `/games/rounds/:roundId/verify`  | Não  | Verificação provably fair           |
| `GET`  | `/games/leaderboard?limit=10`    | Não  | Ranking de jogadores                |
| `POST` | `/games/bet`                     | Sim  | Criar aposta                        |
| `POST` | `/games/bet/cashout`             | Sim  | Cashout manual                      |
| `GET`  | `/games/bets/me`                 | Sim  | Aposta atual do jogador autenticado |
| `GET`  | `/games/bets/:betId`             | Sim  | Buscar aposta por ID                |

### Wallets

| Método | Endpoint          | Auth | Descrição                              |
| ------ | ----------------- | ---- | -------------------------------------- |
| `GET`  | `/wallets/health` | Não  | Health check do Wallets                |
| `POST` | `/wallets`        | Sim  | Criar carteira do jogador autenticado  |
| `GET`  | `/wallets/me`     | Sim  | Buscar carteira do jogador autenticado |

---

## Exemplos de Requisições

### Buscar rodada atual

```bash
curl http://localhost:8000/games/rounds/current | jq
```

### Buscar carteira

```bash
curl http://localhost:8000/wallets/me \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Criar aposta

```bash
curl -X POST http://localhost:8000/games/bet \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents":"1000"}' | jq
```

### Criar aposta com auto cashout

```bash
curl -X POST http://localhost:8000/games/bet \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amountCents":"1000","autoCashoutMultiplier":1.5}' | jq
```

### Cashout manual

```bash
curl -X POST http://localhost:8000/games/bet/cashout \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Leaderboard

```bash
curl "http://localhost:8000/games/leaderboard?limit=10" | jq
```

### Verificação provably fair

```bash
curl "http://localhost:8000/games/rounds/<roundId>/verify" | jq
```

---

## Fluxo do Jogo

### Criação de aposta

1. Jogador chama `POST /games/bet`.
2. Game Service cria uma aposta com status `PENDING_DEBIT`.
3. Game Service grava `wallet.debit.requested` no Outbox.
4. Publisher do Outbox envia o evento ao RabbitMQ.
5. Wallet Service consome o evento.
6. Wallet Service debita a carteira ou rejeita o débito.
7. Wallet Service grava um evento de resultado no Outbox:
   - `wallet.debited`
   - `wallet.debit.rejected`
8. Game Service consome o resultado da Wallet.
9. A aposta se torna:
   - `ACCEPTED`, ou
   - `REJECTED`.

### Cashout manual

1. Jogador chama `POST /games/bet/cashout`.
2. Game Service calcula o payout:
   - `amountCents * currentMultiplier`
3. A aposta se torna `CASHED_OUT_PENDING_CREDIT`.
4. Game Service emite `wallet.credit.requested`.
5. Wallet Service credita a carteira.
6. Wallet Service emite `wallet.credited`.
7. Game Service confirma o cashout.
8. A aposta se torna `CASHED_OUT`.

### Perda no crash

1. A rodada atinge o crash point.
2. Game Service marca como `LOST` todas as apostas aceitas que não fizeram cashout.
3. Nenhum crédito de carteira é emitido para apostas perdidas.

---

## Comunicação Orientada a Eventos

Os eventos são compartilhados pelo pacote `@crash/events`.

### Principais eventos da carteira

| Evento                    | Produtor | Consumidor | Objetivo                     |
| ------------------------- | -------- | ---------- | ---------------------------- |
| `wallet.debit.requested`  | Games    | Wallets    | Solicitar débito da aposta   |
| `wallet.debited`          | Wallets  | Games      | Confirmar débito             |
| `wallet.debit.rejected`   | Wallets  | Games      | Rejeitar débito              |
| `wallet.credit.requested` | Games    | Wallets    | Solicitar crédito de cashout |
| `wallet.credited`         | Wallets  | Games      | Confirmar crédito            |
| `wallet.credit.rejected`  | Wallets  | Games      | Rejeitar crédito             |

---

## Outbox e Inbox Transacional

Os dois serviços usam uma estratégia de Outbox/Inbox transacional.

### Outbox

O serviço primeiro grava as mudanças de domínio e os eventos de integração na mesma transação de banco. Depois, um publisher em background lê eventos pendentes e publica no RabbitMQ.

Isso evita a falha clássica em sistemas distribuídos:

```txt
database write succeeds
message publish fails
```

### Inbox / eventos processados

Os consumers gravam IDs de eventos processados em uma tabela `processed_events`.

Isso garante processamento idempotente e protege contra entregas duplicadas do RabbitMQ.

### Por que isso importa

RabbitMQ trabalha com entrega at-least-once. Portanto, consumers precisam ser idempotentes. Neste projeto, eventos duplicados são tratados como operações seguras sem efeito colateral.

---

## Provably Fair

Cada rodada armazena:

- `serverSeed`
- `serverSeedHash`
- `publicSeed`
- `nonce`
- `crashPointMultiplier`

Antes da rodada ser concluída, a API expõe apenas dados não sensíveis de verificação, como o `serverSeedHash`.

Depois que a rodada é concluída, a API revela o `serverSeed`, permitindo que o jogador verifique independentemente:

- se a hash é válida
- se o crash point foi pré-determinado
- se o resultado não foi manipulado após as apostas

Endpoint:

```txt
GET /games/rounds/:roundId/verify
```

---

## Auto Cashout

Jogadores podem informar um `autoCashoutMultiplier` opcional ao criar uma aposta.

Exemplo:

```json
{
  "amountCents": "1000",
  "autoCashoutMultiplier": 1.5
}
```

Quando a rodada em execução atinge o multiplicador alvo:

1. A engine identifica apostas aceitas elegíveis.
2. A aposta é movida para `CASHED_OUT_PENDING_CREDIT`.
3. Game Service grava um evento `wallet.credit.requested` no Outbox.
4. Wallet Service credita o jogador.
5. Game Service confirma o resultado da Wallet.
6. A aposta se torna `CASHED_OUT`.

Isso é executado pela engine do jogo, sem expor uma nova ação REST.

---

## Leaderboard

O leaderboard ranqueia jogadores por lucro usando apostas finalizadas.

Endpoint:

```txt
GET /games/leaderboard?limit=10
```

Formato da resposta:

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

Apenas apostas finalizadas são consideradas:

- `CASHED_OUT`
- `LOST`

Apostas pendentes ou rejeitadas são ignoradas.

---

## Eventos em Tempo Real

O Game Service expõe um WebSocket Gateway no namespace `/games`.

Eventos emitidos pelo servidor:

| Evento                     | Descrição                    |
| -------------------------- | ---------------------------- |
| `connection.ready`         | Cliente conectado            |
| `round.created`            | Nova rodada criada           |
| `round.started`            | Rodada iniciada              |
| `round.multiplier.updated` | Multiplicador atualizado     |
| `round.crashed`            | Rodada crashou               |
| `round.completed`          | Rodada concluída             |
| `bet.placed`               | Aposta criada                |
| `bet.accepted`             | Débito aceito pela Wallet    |
| `bet.rejected`             | Débito rejeitado pela Wallet |
| `bet.cashed_out`           | Aposta sacada                |

As ações do jogador são executadas via REST. O WebSocket é usado para sincronização servidor-cliente.

---

## Health Checks

Os dois serviços expõem health checks com verificação de dependências reais.

```bash
curl http://localhost:8000/games/health | jq
curl http://localhost:8000/wallets/health | jq
```

Exemplo de resposta:

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

O health check valida:

- disponibilidade do serviço
- conectividade com PostgreSQL
- conectividade com RabbitMQ

---

## Rate Limiting

O Kong aplica rate limiting para proteger a API.

Operações de mudança de estado, como criação de aposta, cashout e criação de carteira, podem ser protegidas com limites mais restritos por rota.

A configuração fica em:

```txt
docker/kong/kong.yml
```

---

## Testes

### Validação pela raiz

Execute o comando principal na raiz do repositório:

```bash
bun run check
```

Esse comando executa:

- typecheck do Games
- lint do Games
- testes unitários do Games
- smoke E2E do Games
- typecheck do Wallets
- lint do Wallets
- testes unitários do Wallets
- E2E do Wallets

### Games

```bash
cd services/games

bun run typecheck
bun run lint
bun test tests/unit
bun run test:e2e
```

### Games Full E2E

A suíte completa de gameplay E2E está disponível, mas não faz parte da validação padrão porque depende do timing real da engine e pode demorar mais.

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

## Pipeline de CI

O GitHub Actions roda em push e pull request.

A pipeline valida:

- instalação de dependências
- geração do Prisma Client
- typecheck
- lint
- testes unitários
- subida da stack Docker
- health checks
- smoke E2E

A pipeline fica em:

```txt
.github/workflows/ci.yml
```

---

## Estrutura do Projeto

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

## Decisões Técnicas

### DDD e bounded contexts

Game e Wallet foram separados porque representam capacidades de negócio diferentes:

- Game controla rodadas, apostas, lógica de crash e verificação fair.
- Wallet controla saldo, débitos, créditos e consistência monetária.

Essa separação mantém as regras de domínio isoladas e evita acoplamento direto entre bancos de dados.

### Consistência assíncrona

Operações de Wallet são assíncronas. Uma aposta começa como `PENDING_DEBIT` e só se torna `ACCEPTED` quando o Wallet Service confirma o débito.

Isso representa melhor um sistema distribuído real e evita acoplamento síncrono entre serviços.

### Precisão monetária

Todos os valores monetários são armazenados em centavos inteiros usando `BigInt`. Não é usado ponto flutuante para saldo de carteira.

### Outbox/Inbox

O Outbox garante persistência de eventos junto com mudanças de domínio. O Inbox garante consumo idempotente.

### Smoke vs Full E2E

A engine real do jogo é baseada em tempo e tem comportamento probabilístico. Testes Full E2E são úteis, mas podem ser lentos e instáveis se executados em todo CI.

Por isso:

- Smoke E2E é usado na validação padrão.
- Full E2E continua disponível para validação manual mais profunda.

---

## Trade-offs e Melhorias Futuras

### Frontend

O frontend não foi concluído. Backend e infraestrutura foram priorizados para demonstrar arquitetura distribuída, comunicação orientada a eventos, resiliência e correção do gameplay principal.

Trabalhos futuros no frontend:

- login autenticado com Keycloak
- tela do jogo com animação do multiplicador
- apostas da rodada atual
- saldo da carteira
- botão de cashout manual
- input de auto cashout
- UI de leaderboard
- página de verificação provably fair

### Auto Bet

Auto Bet não foi implementado porque exigiria estado adicional de estratégia por jogador e criação agendada de apostas em novas rodadas.

Uma implementação segura precisaria de:

- configuração de estratégia por jogador
- criação idempotente de apostas por rodada
- stop-loss
- proteções contra débitos automáticos repetidos

### Observabilidade

O projeto possui health checks e logs básicos de lifecycle, mas não implementa OpenTelemetry completo.

Melhorias futuras:

- traces com OpenTelemetry
- métricas Prometheus
- dashboards Grafana
- métricas de latência de eventos RabbitMQ
- métricas de RTP e volume de apostas

### Janela do Leaderboard

O leaderboard atual é global. Ele pode ser expandido para suportar janelas de tempo:

- 24h
- 7d
- all-time

### Estabilidade do Full E2E

A suíte Full E2E pode ser melhorada com geração determinística de rodadas para teste ou um clock controlável da engine.

---

## Comandos Úteis

```bash
# Subir stack completa
bun run docker:up

# Parar stack
bun run docker:down

# Resetar stack
bun run docker:prune

# Validar tudo
bun run check

# Acompanhar logs
bun run docker:logs

# Ver containers
bun run docker:ps
```

## Swagger / OpenAPI

O Swagger está disponível diretamente em cada serviço e também via Kong:

| Serviço | URL direta                   | URL via Kong                         |
| ------- | ---------------------------- | ------------------------------------ |
| Games   | `http://localhost:4001/docs` | `http://localhost:8000/games/docs`   |
| Wallets | `http://localhost:4002/docs` | `http://localhost:8000/wallets/docs` |

A API pública deve ser acessada pelo Kong:

| Serviço     | URL via Kong                    |
| ----------- | ------------------------------- |
| Games API   | `http://localhost:8000/games`   |
| Wallets API | `http://localhost:8000/wallets` |

## Notas Finais

Esta implementação foca em arquitetura backend, modelagem de domínio, consistência orientada a eventos, idempotência e confiabilidade operacional.

As principais escolhas técnicas foram:

- bounded contexts separados
- liquidação assíncrona de carteira
- Outbox/Inbox transacional
- aritmética monetária baseada em inteiros
- verificação provably fair
- proteção via API Gateway
- smoke E2E rápido para CI
- full E2E disponível para validação mais profunda
