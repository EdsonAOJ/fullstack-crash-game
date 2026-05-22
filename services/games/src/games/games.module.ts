import { Module } from "@nestjs/common";
import type { Clock } from "../application/ports/clock";
import type { GameRealtimeNotifier } from "../application/ports/game-realtime.notifier";
import type { GameUnitOfWork } from "../application/ports/game-unit-of-work";
import type { IdGenerator } from "../application/ports/id-generator";
import type { OutboxRepository } from "../application/ports/outbox.repository";
import type { RoundRepository } from "../application/ports/round.repository";
import type { WalletEventsPublisher } from "../application/ports/wallet-events.publisher";
import { OutboxPublisherService } from "../application/services/outbox-publisher.service";
import {
  CLOCK,
  GAME_REALTIME_NOTIFIER,
  GAME_UNIT_OF_WORK,
  ID_GENERATOR,
  OUTBOX_REPOSITORY,
  PROCESSED_EVENT_REPOSITORY,
  ROUND_REPOSITORY,
  WALLET_EVENTS_PUBLISHER,
} from "../application/tokens/game.tokens";
import { CashoutBetUseCase } from "../application/use-cases/cashout-bet.use-case";
import { ConfirmWalletCreditUseCase } from "../application/use-cases/confirm-wallet-credit.use-case";
import { ConfirmWalletDebitUseCase } from "../application/use-cases/confirm-wallet-debit.use-case";
import { GetBetByIdUseCase } from "../application/use-cases/get-bet-by-id.use-case";
import { GetCurrentRoundUseCase } from "../application/use-cases/get-current-round.use-case";
import { GetLatestRoundUseCase } from "../application/use-cases/get-latest-round.use-case";
import { GetMyCurrentBetUseCase } from "../application/use-cases/get-my-current-bet.use-case";
import { GetRoundVerifyUseCase } from "../application/use-cases/get-round-verify.use-case";
import { GetRoundsHistoryUseCase } from "../application/use-cases/get-rounds-history.use-case";
import { PlaceBetUseCase } from "../application/use-cases/place-bet.use-case";
import { RejectWalletDebitUseCase } from "../application/use-cases/reject-wallet-debit.use-case";
import { ProvablyFairService } from "../domain/services/provably-fair.service";
import { CryptoIdGenerator } from "../infrastructure/common/crypto-id-generator";
import { SystemClock } from "../infrastructure/common/system-clock";
import { PrismaGameUnitOfWork } from "../infrastructure/database/prisma/prisma-game-unit-of-work";
import { PrismaOutboxRepository } from "../infrastructure/database/prisma/prisma-outbox.repository";
import { PrismaRoundRepository } from "../infrastructure/database/prisma/prisma-round.repository";
import { PrismaService } from "../infrastructure/database/prisma/prisma.service";
import { GameEngineService } from "../infrastructure/engine/game-engine.service";
import { JwtAuthGuard } from "../infrastructure/auth/jwt-auth.guard";
import { RabbitMQConnectionService } from "../infrastructure/messaging/rabbitmq/rabbitmq-connection.service";
import { WalletEventsConsumer } from "../infrastructure/messaging/rabbitmq/wallet-events.consumer";
import { RabbitMQWalletEventsPublisher } from "../infrastructure/messaging/rabbitmq/wallet-events.publisher";
import { OutboxPublisherRunner } from "../infrastructure/outbox/outbox-publisher.runner";
import { GameEventsGateway } from "../infrastructure/realtime/game-events.gateway";
import { GamesController } from "../presentation/controllers/games.controller";
import { PrismaProcessedEventRepository } from "@/infrastructure/database/prisma/prisma-processed-event.repository";
import { WalletResultProcessor } from "@/application/services/wallet-result-processor.service";
import { HealthService } from "@/infrastructure/health/health.service";

@Module({
  controllers: [GamesController],
  providers: [
    PrismaService,
    CryptoIdGenerator,
    SystemClock,
    ProvablyFairService,
    RabbitMQWalletEventsPublisher,
    RabbitMQConnectionService,
    GameEventsGateway,
    JwtAuthGuard,
    OutboxPublisherRunner,
    HealthService,
    {
      provide: GAME_REALTIME_NOTIFIER,
      useExisting: GameEventsGateway,
    },
    {
      provide: ROUND_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaRoundRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: OUTBOX_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaOutboxRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: GAME_UNIT_OF_WORK,
      useFactory: (prisma: PrismaService) => new PrismaGameUnitOfWork(prisma),
      inject: [PrismaService],
    },
    {
      provide: WALLET_EVENTS_PUBLISHER,
      useExisting: RabbitMQWalletEventsPublisher,
    },
    {
      provide: ID_GENERATOR,
      useExisting: CryptoIdGenerator,
    },
    {
      provide: CLOCK,
      useExisting: SystemClock,
    },
    {
      provide: WalletEventsConsumer,
      useFactory: (
        rabbitMq: RabbitMQConnectionService,
        walletResultProcessor: WalletResultProcessor,
      ) => new WalletEventsConsumer(rabbitMq, walletResultProcessor),
      inject: [RabbitMQConnectionService, WalletResultProcessor],
    },
    {
      provide: PlaceBetUseCase,
      useFactory: (
        roundRepository: RoundRepository,
        gameUnitOfWork: GameUnitOfWork,
        idGenerator: IdGenerator,
        clock: Clock,
        realtimeNotifier: GameRealtimeNotifier,
      ) =>
        new PlaceBetUseCase(
          roundRepository,
          gameUnitOfWork,
          idGenerator,
          clock,
          realtimeNotifier,
        ),
      inject: [
        ROUND_REPOSITORY,
        GAME_UNIT_OF_WORK,
        ID_GENERATOR,
        CLOCK,
        GAME_REALTIME_NOTIFIER,
      ],
    },
    {
      provide: CashoutBetUseCase,
      useFactory: (
        roundRepository: RoundRepository,
        gameUnitOfWork: GameUnitOfWork,
        idGenerator: IdGenerator,
        clock: Clock,
        realtimeNotifier: GameRealtimeNotifier,
      ) =>
        new CashoutBetUseCase(
          roundRepository,
          gameUnitOfWork,
          idGenerator,
          clock,
          realtimeNotifier,
        ),
      inject: [
        ROUND_REPOSITORY,
        GAME_UNIT_OF_WORK,
        ID_GENERATOR,
        CLOCK,
        GAME_REALTIME_NOTIFIER,
      ],
    },
    {
      provide: ConfirmWalletDebitUseCase,
      useFactory: (
        roundRepository: RoundRepository,
        clock: Clock,
        realtimeNotifier: GameRealtimeNotifier,
      ) =>
        new ConfirmWalletDebitUseCase(roundRepository, clock, realtimeNotifier),
      inject: [ROUND_REPOSITORY, CLOCK, GAME_REALTIME_NOTIFIER],
    },
    {
      provide: RejectWalletDebitUseCase,
      useFactory: (
        roundRepository: RoundRepository,
        clock: Clock,
        realtimeNotifier: GameRealtimeNotifier,
      ) =>
        new RejectWalletDebitUseCase(roundRepository, clock, realtimeNotifier),
      inject: [ROUND_REPOSITORY, CLOCK, GAME_REALTIME_NOTIFIER],
    },
    {
      provide: ConfirmWalletCreditUseCase,
      useFactory: (
        roundRepository: RoundRepository,
        clock: Clock,
        realtimeNotifier: GameRealtimeNotifier,
      ) =>
        new ConfirmWalletCreditUseCase(
          roundRepository,
          clock,
          realtimeNotifier,
        ),
      inject: [ROUND_REPOSITORY, CLOCK, GAME_REALTIME_NOTIFIER],
    },

    {
      provide: GetCurrentRoundUseCase,
      useFactory: (roundRepository: RoundRepository) =>
        new GetCurrentRoundUseCase(roundRepository),
      inject: [ROUND_REPOSITORY],
    },
    {
      provide: GetMyCurrentBetUseCase,
      useFactory: (roundRepository: RoundRepository) =>
        new GetMyCurrentBetUseCase(roundRepository),
      inject: [ROUND_REPOSITORY],
    },
    {
      provide: GetLatestRoundUseCase,
      useFactory: (roundRepository: RoundRepository) =>
        new GetLatestRoundUseCase(roundRepository),
      inject: [ROUND_REPOSITORY],
    },
    {
      provide: GetRoundsHistoryUseCase,
      useFactory: (roundRepository: RoundRepository) =>
        new GetRoundsHistoryUseCase(roundRepository),
      inject: [ROUND_REPOSITORY],
    },
    {
      provide: GetRoundVerifyUseCase,
      useFactory: (
        roundRepository: RoundRepository,
        provablyFairService: ProvablyFairService,
      ) => new GetRoundVerifyUseCase(roundRepository, provablyFairService),
      inject: [ROUND_REPOSITORY, ProvablyFairService],
    },
    {
      provide: GetBetByIdUseCase,
      useFactory: (roundRepository: RoundRepository) =>
        new GetBetByIdUseCase(roundRepository),
      inject: [ROUND_REPOSITORY],
    },

    {
      provide: GameEngineService,
      useFactory: (
        roundRepository: RoundRepository,
        idGenerator: IdGenerator,
        clock: Clock,
        provablyFairService: ProvablyFairService,
        realtimeNotifier: GameRealtimeNotifier,
      ) =>
        new GameEngineService(
          roundRepository,
          idGenerator,
          clock,
          provablyFairService,
          realtimeNotifier,
        ),
      inject: [
        ROUND_REPOSITORY,
        ID_GENERATOR,
        CLOCK,
        ProvablyFairService,
        GAME_REALTIME_NOTIFIER,
      ],
    },

    {
      provide: OutboxPublisherService,
      useFactory: (
        outboxRepository: OutboxRepository,
        walletEventsPublisher: WalletEventsPublisher,
      ) => new OutboxPublisherService(outboxRepository, walletEventsPublisher),
      inject: [OUTBOX_REPOSITORY, WALLET_EVENTS_PUBLISHER],
    },

    {
      provide: PROCESSED_EVENT_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaProcessedEventRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: WalletResultProcessor,
      useFactory: (
        gameUnitOfWork: GameUnitOfWork,
        clock: Clock,
        realtimeNotifier: GameRealtimeNotifier,
      ) => new WalletResultProcessor(gameUnitOfWork, clock, realtimeNotifier),
      inject: [GAME_UNIT_OF_WORK, CLOCK, GAME_REALTIME_NOTIFIER],
    },
  ],
})
export class GamesModule {}
