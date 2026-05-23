# Crash Game — Desafio Full-stack

Implementação de um **Crash Game full-stack** para o desafio técnico da Jungle Gaming.

O projeto entrega uma aplicação completa com:

- frontend em **Next.js + React + TypeScript**;
- backend distribuído com **NestJS + Bun**;
- dois bounded contexts principais: **Games** e **Wallets**;
- comunicação assíncrona via **RabbitMQ**;
- persistência com **PostgreSQL + Prisma**;
- autenticação com **Keycloak / OpenID Connect / JWT**;
- API Gateway com **Kong**;
- WebSocket para eventos em tempo real;
- engine de rodada com crash point;
- cashout manual;
- auto cashout;
- leaderboard;
- histórico de apostas;
- carteira do jogador;
- verificação **Provably Fair**;
- Outbox/Inbox transacional;
- idempotência por evento e por referência de negócio;
- Swagger/OpenAPI;
- Docker Compose;
- testes unitários e E2E;
- CI com GitHub Actions.

---

## Sumário

- [1. Visão geral](#1-visão-geral)
- [2. Stack técnica](#2-stack-técnica)
- [3. Arquitetura](#3-arquitetura)
- [4. Serviços e portas](#4-serviços-e-portas)
- [5. Como rodar](#5-como-rodar)
- [6. Usuário demo](#6-usuário-demo)
- [7. Frontend](#7-frontend)
- [8. Swagger / OpenAPI](#8-swagger--openapi)
- [9. Principais endpoints](#9-principais-endpoints)
- [10. Exemplos de requisições](#10-exemplos-de-requisições)
- [11. Fluxo do jogo](#11-fluxo-do-jogo)
- [12. Comunicação orientada a eventos](#12-comunicação-orientada-a-eventos)
- [13. Outbox / Inbox transacional](#13-outbox--inbox-transacional)
- [14. Idempotência e consistência](#14-idempotência-e-consistência)
- [15. Provably Fair](#15-provably-fair)
- [16. Auto Cashout](#16-auto-cashout)
- [17. Leaderboard](#17-leaderboard)
- [18. WebSocket](#18-websocket)
- [19. Health checks](#19-health-checks)
- [20. Testes](#20-testes)
- [21. CI](#21-ci)
- [22. Estrutura do projeto](#22-estrutura-do-projeto)
- [23. Decisões técnicas](#23-decisões-técnicas)
- [24. Trade-offs e próximos passos](#24-trade-offs-e-próximos-passos)
- [25. Comandos úteis](#25-comandos-úteis)

---

## 1. Visão geral

Um Crash Game é um jogo de apostas em tempo real no qual um multiplicador começa em `1.00x` e cresce até crashar. O jogador aposta antes da rodada iniciar e precisa realizar cashout antes do crash para receber o payout.

Neste projeto, a aplicação foi desenhada como um sistema distribuído simples, separando responsabilidades em serviços independentes.

### Games Service

Responsável por:

- rodadas;
- apostas;
- engine do jogo;
- multiplicador;
- crash point;
- cashout manual;
- auto cashout;
- histórico de rodadas;
- histórico de apostas;
- leaderboard;
- Provably Fair;
- publicação de eventos para a Wallet;
- consumo de eventos de resultado da Wallet;
- WebSocket em tempo real.

### Wallets Service

Responsável por:

- carteira do jogador;
- saldo;
- débitos;
- créditos;
- transações financeiras;
- rejeição por saldo insuficiente;
- idempotência de transações;
- consumo de solicitações financeiras;
- publicação de resultados financeiros.

### Frontend

Responsável por:

- exibir a rodada atual;
- mostrar o multiplicador em tempo real;
- autenticar o usuário demo;
- exibir saldo da carteira;
- permitir aposta;
- permitir cashout;
- permitir auto cashout;
- exibir histórico de rodadas;
- exibir histórico das apostas do jogador;
- exibir leaderboard;
- exibir painel de Provably Fair;
- sincronizar dados via WebSocket e polling de fallback.

---

## 2. Stack técnica

| Camada         | Tecnologia                               |
| -------------- | ---------------------------------------- |
| Frontend       | Next.js, React, TypeScript, Tailwind CSS |
| Runtime        | Bun                                      |
| Backend        | NestJS, TypeScript                       |
| Banco de dados | PostgreSQL                               |
| ORM            | Prisma                                   |
| Mensageria     | RabbitMQ                                 |
| API Gateway    | Kong                                     |
| Autenticação   | Keycloak / OpenID Connect / JWT          |
| Tempo real     | Socket.IO / NestJS WebSocket Gateway     |
| Validação      | Zod                                      |
| Documentação   | Swagger / OpenAPI                        |
| Testes         | Bun test runner                          |
| Infra local    | Docker Compose                           |
| CI             | GitHub Actions                           |

---

## 3. Arquitetura

```txt
                    ┌──────────────────────────┐
                    │        Frontend           │
                    │   Next.js / React / UI    │
                    └───────────┬──────────────┘
                                │
                         HTTP / WebSocket
                                │
                    ┌───────────▼──────────────┐
                    │           Kong            │
                    │        API Gateway        │
                    └───────┬──────────┬───────┘
                            │          │
              ┌─────────────▼──┐   ┌───▼─────────────┐
              │     Games       │   │     Wallets     │
              │    Service      │   │     Service     │
              │ NestJS + Bun    │   │ NestJS + Bun    │
              └──────┬─────┬───┘   └──────┬──────────┘
                     │     │              │
               ┌─────▼───┐ │        ┌─────▼───┐
               │Postgres │ │        │Postgres │
               │games DB │ │        │walletsDB│
               └─────────┘ │        └─────────┘
                           │
                    ┌──────▼──────┐
                    │   RabbitMQ   │
                    │    Events    │
                    └─────────────┘

              ┌────────────────────┐
              │      Keycloak       │
              │   OIDC / JWT Auth   │
              └────────────────────┘
```

A aplicação usa uma arquitetura orientada a eventos entre Games e Wallets. O Games nunca altera diretamente o saldo do jogador. Ele solicita débito ou crédito por evento, e a Wallet responde com eventos de resultado.

---

## 4. Serviços e portas

| Serviço             | URL                      |
| ------------------- | ------------------------ |
| Frontend            | `http://localhost:3000`  |
| Kong Proxy          | `http://localhost:8000`  |
| Kong Admin          | `http://localhost:8001`  |
| Games direto        | `http://localhost:4001`  |
| Wallets direto      | `http://localhost:4002`  |
| Keycloak            | `http://localhost:8080`  |
| RabbitMQ Management | `http://localhost:15672` |
| PostgreSQL          | `localhost:5435`         |

Credenciais locais:

| Serviço        | Usuário | Senha   |
| -------------- | ------- | ------- |
| Keycloak Admin | `admin` | `admin` |
| RabbitMQ       | `admin` | `admin` |
| PostgreSQL     | `admin` | `admin` |

---

## 5. Como rodar

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

- PostgreSQL;
- RabbitMQ;
- Keycloak;
- Games Service;
- Wallets Service;
- Kong;
- Frontend.

As migrations e seeds são executadas automaticamente no startup dos serviços.

### Acessar a aplicação

```txt
http://localhost:3000
```

### Parar a stack

```bash
bun run docker:down
```

### Resetar tudo

```bash
bun run docker:prune
```

Esse comando remove containers, volumes, imagens locais e órfãos criados pelo Compose.

---

## 6. Usuário demo

O Keycloak importa automaticamente o realm local.

| Item      | Valor               |
| --------- | ------------------- |
| Realm     | `crash-game`        |
| Client ID | `crash-game-client` |
| Usuário   | `player`            |
| Senha     | `player123`         |

### Obter token manualmente

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

## 7. Frontend

O frontend foi implementado com Next.js e roda em:

```txt
http://localhost:3000
```

### Recursos implementados

- layout dark/neon;
- gráfico visual do crash;
- multiplicador em tempo real;
- autenticação automática do usuário demo;
- painel de carteira;
- aposta com valor em reais;
- validação de valor mínimo e máximo;
- cashout manual;
- auto cashout;
- histórico de rodadas;
- histórico das minhas apostas;
- leaderboard;
- painel de Provably Fair;
- toasts de sucesso e erro;
- feedback de estados do jogo;
- WebSocket para rodada/apostas;
- polling de fallback para carteira, histórico e leaderboard;
- responsividade básica.

### Variáveis do frontend

No Docker, o frontend usa:

```txt
KONG_URL=http://kong:8000
KEYCLOAK_TOKEN_URL=http://keycloak:8080/realms/crash-game/protocol/openid-connect/token
KEYCLOAK_CLIENT_ID=crash-game-client
KEYCLOAK_USERNAME=player
KEYCLOAK_PASSWORD=player123
NEXT_PUBLIC_GAMES_SOCKET_URL=http://localhost:4001/games
```

Fora do Docker, o arquivo `frontend/.env.local` usa `localhost`.

### Proxy interno do Next.js

O frontend usa rotas internas para evitar expor detalhes de backend diretamente em todos os componentes:

```txt
/api/auth/token
/api/proxy/games/*
/api/proxy/wallets/*
```

---

## 8. Swagger / OpenAPI

Swagger está disponível diretamente em cada serviço:

| Serviço | URL direta                   |
| ------- | ---------------------------- |
| Games   | `http://localhost:4001/docs` |
| Wallets | `http://localhost:4002/docs` |

Wallets também está disponível via Kong:

| Serviço | URL via Kong                         |
| ------- | ------------------------------------ |
| Wallets | `http://localhost:8000/wallets/docs` |

A API pública deve ser acessada pelo Kong:

| Serviço     | URL via Kong                    |
| ----------- | ------------------------------- |
| Games API   | `http://localhost:8000/games`   |
| Wallets API | `http://localhost:8000/wallets` |

Observação: a API de Games funciona via Kong em `/games`, mas a documentação Swagger de Games pode ser acessada diretamente em `http://localhost:4001/docs`.

---

## 9. Principais endpoints

### Games

| Método | Endpoint                         | Auth | Descrição                                    |
| ------ | -------------------------------- | ---- | -------------------------------------------- |
| `GET`  | `/games/health`                  | Não  | Health check do Games                        |
| `GET`  | `/games/rounds/current`          | Não  | Rodada atual                                 |
| `GET`  | `/games/rounds/latest`           | Não  | Última rodada finalizada                     |
| `GET`  | `/games/rounds/history?limit=10` | Não  | Histórico de rodadas                         |
| `GET`  | `/games/rounds/:roundId/verify`  | Não  | Verificação Provably Fair                    |
| `GET`  | `/games/leaderboard?limit=10`    | Não  | Ranking de jogadores                         |
| `POST` | `/games/bet`                     | Sim  | Criar aposta                                 |
| `POST` | `/games/bet/cashout`             | Sim  | Cashout manual                               |
| `GET`  | `/games/bets/me?limit=10`        | Sim  | Histórico das apostas do jogador autenticado |
| `GET`  | `/games/bets/:betId`             | Sim  | Buscar aposta por ID                         |

### Wallets

| Método | Endpoint          | Auth | Descrição                              |
| ------ | ----------------- | ---- | -------------------------------------- |
| `GET`  | `/wallets/health` | Não  | Health check do Wallets                |
| `POST` | `/wallets`        | Sim  | Criar carteira do jogador autenticado  |
| `GET`  | `/wallets/me`     | Sim  | Buscar carteira do jogador autenticado |

---

## 10. Exemplos de requisições

### Health checks

```bash
curl http://localhost:8000/games/health | jq
curl http://localhost:8000/wallets/health | jq
```

### Rodada atual

```bash
curl http://localhost:8000/games/rounds/current | jq
```

### Histórico de rodadas

```bash
curl "http://localhost:8000/games/rounds/history?limit=10" | jq
```

### Leaderboard

```bash
curl "http://localhost:8000/games/leaderboard?limit=10" | jq
```

### Carteira do jogador

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
  -d '{"amountCents":"1000","autoCashoutMultiplier":2}' | jq
```

### Cashout manual

```bash
curl -X POST http://localhost:8000/games/bet/cashout \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Histórico das minhas apostas

```bash
curl "http://localhost:8000/games/bets/me?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### Provably Fair

```bash
curl "http://localhost:8000/games/rounds/<roundId>/verify" | jq
```

---

## 11. Fluxo do jogo

### Criação de aposta

1. O jogador chama `POST /games/bet`.
2. Games cria uma aposta com status `PENDING_DEBIT`.
3. Games persiste a aposta e grava `wallet.debit.requested` no Outbox.
4. O Outbox Publisher publica o evento no RabbitMQ.
5. Wallets consome o evento.
6. Wallets tenta debitar o saldo do jogador.
7. Wallets grava um evento de resultado no Outbox:
   - `wallet.debited`;
   - `wallet.debit.rejected`.
8. Games consome o evento de resultado.
9. A aposta passa para:
   - `ACCEPTED`, quando o débito foi aprovado;
   - `REJECTED`, quando o débito foi negado.

### Cashout manual

1. O jogador chama `POST /games/bet/cashout`.
2. Games encontra a aposta aceita do jogador na rodada atual.
3. Games calcula o payout com base no multiplicador atual.
4. A aposta passa para `CASHED_OUT_PENDING_CREDIT`.
5. Games grava `wallet.credit.requested` no Outbox.
6. Wallets consome o evento e credita o saldo.
7. Wallets grava `wallet.credited` no Outbox.
8. Games consome `wallet.credited`.
9. Games confirma a aposta como `CASHED_OUT`.

### Auto cashout

1. O jogador cria a aposta com `autoCashoutMultiplier`.
2. Durante a rodada, a engine atualiza o multiplicador.
3. Quando o multiplicador atinge o alvo, Games solicita cashout automaticamente.
4. O fluxo segue o mesmo caminho assíncrono do cashout manual.

### Perda no crash

1. A rodada atinge o crash point.
2. Games marca apostas aceitas e não sacadas como `LOST`.
3. Nenhum crédito é solicitado para apostas perdidas.

---

## 12. Comunicação orientada a eventos

Os contratos de eventos ficam no pacote compartilhado:

```txt
packages/events
```

Eventos principais:

| Evento                    | Produtor | Consumidor | Objetivo                     |
| ------------------------- | -------- | ---------- | ---------------------------- |
| `wallet.debit.requested`  | Games    | Wallets    | Solicitar débito da aposta   |
| `wallet.debited`          | Wallets  | Games      | Confirmar débito             |
| `wallet.debit.rejected`   | Wallets  | Games      | Rejeitar débito              |
| `wallet.credit.requested` | Games    | Wallets    | Solicitar crédito de cashout |
| `wallet.credited`         | Wallets  | Games      | Confirmar crédito            |
| `wallet.credit.rejected`  | Wallets  | Games      | Rejeitar crédito             |

### Por que eventos?

O domínio de jogo e o domínio financeiro foram separados para evitar acoplamento direto. O Games não conhece a implementação interna de saldo, e o Wallets não conhece a engine de crash.

Esse desenho permite que os serviços evoluam de forma independente.

---

## 13. Outbox / Inbox transacional

Os dois serviços usam Outbox e Inbox transacional.

### Outbox

Em vez de publicar diretamente no RabbitMQ dentro do fluxo principal, o serviço grava primeiro o evento no banco, na mesma transação da mudança de domínio.

Depois, um publisher em background lê eventos pendentes e publica no RabbitMQ.

Isso evita o problema clássico:

```txt
database write succeeds
message publish fails
```

### Inbox / Processed Events

Consumers registram o `eventId` em `processed_events`.

Se o mesmo evento chegar novamente, o serviço detecta que ele já foi processado e ignora com segurança.

RabbitMQ entrega mensagens com semântica at-least-once, então idempotência é obrigatória.

---

## 14. Idempotência e consistência

O projeto trata idempotência em dois níveis.

### Idempotência por evento

Cada evento consumido é registrado em `processed_events`.

Isso evita executar duas vezes o mesmo comando quando RabbitMQ reentrega uma mensagem.

### Idempotência de negócio

Além do `eventId`, Wallets protege transações financeiras usando referência de negócio.

Para transações de carteira, a combinação de tipo, referência e ID da referência impede duplicidade lógica, como dois créditos para o mesmo cashout.

Exemplo de referência de negócio:

```txt
type: CREDIT
referenceType: CASHOUT
referenceId: <betId>
```

### Correção de consistência importante

Foi corrigido um cenário em que `wallet.credited` chegava ao Games depois que a rodada já havia sido concluída.

Antes, a confirmação do crédito procurava apenas a rodada atual. Se a rodada já estivesse `COMPLETED`, a aposta não era encontrada e ficava presa em `CASHED_OUT_PENDING_CREDIT`.

A correção foi buscar a rodada pela própria aposta (`betId`), permitindo confirmar o cashout mesmo após a conclusão da rodada.

---

## 15. Provably Fair

Cada rodada possui dados usados para verificação do resultado:

- `serverSeed`;
- `serverSeedHash`;
- `publicSeed`;
- `nonce`;
- `crashPointMultiplier`.

Antes da rodada finalizar, apenas informações não sensíveis são expostas, como o `serverSeedHash`.

Depois da conclusão, a API revela o `serverSeed`, permitindo verificar:

- se o hash da seed é válido;
- se o crash point foi calculado corretamente;
- se o resultado não foi alterado depois das apostas.

Endpoint:

```txt
GET /games/rounds/:roundId/verify
```

O frontend também possui um painel de Provably Fair para validar a última rodada finalizada.

---

## 16. Auto Cashout

Ao criar uma aposta, o jogador pode enviar:

```json
{
  "amountCents": "1000",
  "autoCashoutMultiplier": 2
}
```

Quando o multiplicador da rodada atinge esse valor:

1. Games identifica a aposta elegível.
2. A aposta muda para `CASHED_OUT_PENDING_CREDIT`.
3. Games emite `wallet.credit.requested`.
4. Wallets credita o saldo.
5. Wallets emite `wallet.credited`.
6. Games confirma o cashout.
7. A aposta muda para `CASHED_OUT`.

Auto cashout é executado pela engine, sem exigir nova chamada REST do jogador.

---

## 17. Leaderboard

Endpoint:

```txt
GET /games/leaderboard?limit=10
```

O leaderboard considera apostas finalizadas:

- `CASHED_OUT`;
- `LOST`.

E calcula:

- quantidade de apostas;
- quantidade de cashouts;
- quantidade de perdas;
- total apostado;
- total recebido;
- lucro/prejuízo.

Exemplo:

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

---

## 18. WebSocket

O Games Service expõe WebSocket no namespace:

```txt
/games
```

No frontend local, a conexão usa:

```txt
http://localhost:4001/games
```

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

As ações do jogador são feitas via REST. O WebSocket é usado para sincronizar a interface em tempo real.

O frontend também executa polling periódico como fallback para dados complementares:

- carteira;
- histórico de apostas;
- histórico de rodadas;
- leaderboard.

---

## 19. Health checks

Os serviços expõem health checks com verificação de dependências reais.

```bash
curl http://localhost:8000/games/health | jq
curl http://localhost:8000/wallets/health | jq
```

Exemplo:

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

Os checks validam:

- disponibilidade do serviço;
- conexão com PostgreSQL;
- conexão com RabbitMQ.

---

## 20. Testes

### Validação de backend

```bash
bun run check
```

Executa:

- typecheck do Games;
- lint do Games;
- testes unitários do Games;
- smoke E2E do Games;
- typecheck do Wallets;
- lint do Wallets;
- testes unitários do Wallets;
- E2E do Wallets.

### Validação completa

```bash
bun run check:all
```

Executa `check` e também:

- lint do frontend;
- build do frontend.

### Games

```bash
cd services/games

bun run typecheck
bun run lint
bun test tests/unit
bun run test:e2e
```

### Games Full E2E

```bash
cd services/games

bun run test:e2e:full
```

A suíte full E2E é mais próxima do fluxo completo de gameplay, mas pode depender mais do timing real da engine.

### Wallets

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

---

## 21. CI

O projeto possui pipeline de CI com GitHub Actions.

A pipeline valida:

- instalação de dependências;
- geração do Prisma Client;
- typecheck;
- lint;
- testes unitários;
- subida da stack Docker;
- health checks;
- smoke E2E.

Arquivo:

```txt
.github/workflows/ci.yml
```

---

## 22. Estrutura do projeto

```txt
fullstack-challenge/
├── docker/
│   ├── keycloak/
│   ├── kong/
│   └── postgres/
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
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

## 23. Decisões técnicas

### DDD e bounded contexts

Games e Wallets foram separados porque representam capacidades de negócio diferentes.

Games controla:

- rodadas;
- apostas;
- engine;
- crash;
- cashout;
- leaderboard;
- Provably Fair.

Wallets controla:

- saldo;
- débito;
- crédito;
- transações;
- consistência financeira.

Essa separação evita acoplamento direto entre domínios e bancos.

### Consistência assíncrona

A liquidação financeira é assíncrona. Isso simula melhor um ambiente distribuído real.

A aposta começa como `PENDING_DEBIT` e só vira `ACCEPTED` quando Wallets confirma o débito.

O cashout começa como `CASHED_OUT_PENDING_CREDIT` e só vira `CASHED_OUT` quando Wallets confirma o crédito.

### Precisão monetária

Valores monetários são armazenados em centavos inteiros. O projeto evita ponto flutuante para saldo, débito, crédito e payout.

### Outbox e Inbox

Outbox protege a publicação de eventos. Inbox protege o consumo idempotente.

### WebSocket + polling

WebSocket atualiza eventos críticos em tempo real. Polling complementa dados derivados e estados que podem depender de consistência eventual.

### Smoke E2E vs Full E2E

A engine trabalha com tempo real. Para manter a validação padrão rápida e estável, o projeto separa:

- smoke E2E para validação principal;
- full E2E para validação manual mais completa.

---

## 24. Trade-offs e próximos passos

Pontos que podem evoluir:

- login interativo real com Keycloak no frontend;
- múltiplos usuários simultâneos na interface;
- Auto Bet;
- configuração de estratégia automática por jogador;
- stop-loss;
- janelas de leaderboard por período;
- OpenTelemetry;
- tracing distribuído;
- métricas Prometheus;
- dashboards Grafana;
- testes E2E do frontend com Playwright;
- WebSocket também roteado via Kong;
- deploy em cloud com ECS/Fargate, Kubernetes ou outra plataforma;
- observabilidade de latência de eventos;
- tela administrativa para auditoria de rodadas e transações.

---

## 25. Comandos úteis

```bash
# Instalar dependências
bun install

# Subir stack completa
bun run docker:up

# Parar stack
bun run docker:down

# Resetar containers, volumes, imagens locais e órfãos
bun run docker:prune

# Ver containers
bun run docker:ps

# Acompanhar logs
bun run docker:logs

# Reiniciar Kong
bun run docker:restart:kong

# Validar backend
bun run check

# Validar backend + frontend
bun run check:all

# Build do frontend via Docker
docker compose build frontend

# Subir apenas frontend
docker compose up -d frontend
```
