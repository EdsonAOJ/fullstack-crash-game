import { Module } from "@nestjs/common";
import {
  CLOCK,
  ID_GENERATOR,
  OUTBOX_REPOSITORY,
  PROCESSED_EVENT_REPOSITORY,
  WALLET_REPOSITORY,
  WALLET_UNIT_OF_WORK,
} from "../application/tokens/wallet.tokens";
import { CreateWalletUseCase } from "../application/use-cases/create-wallet.use-case";
import { CreditWalletUseCase } from "../application/use-cases/credit-wallet.use-case";
import { DebitWalletUseCase } from "../application/use-cases/debit-wallet.use-case";
import { GetWalletByPlayerUseCase } from "../application/use-cases/get-wallet-by-player.use-case";
import { CryptoIdGenerator } from "../infrastructure/common/crypto-id-generator";
import { SystemClock } from "../infrastructure/common/system-clock";
import { PrismaService } from "../infrastructure/database/prisma/prisma.service";
import { PrismaWalletRepository } from "../infrastructure/database/prisma/prisma-wallet.repository";
import { WalletsController } from "../presentation/controllers/wallets.controller";
import { RabbitMQConnectionService } from "../infrastructure/messaging/rabbitmq/rabbitmq-connection.service";
import { WalletEventsPublisher } from "../infrastructure/messaging/rabbitmq/wallet-events.publisher";
import { JwtAuthGuard } from "../infrastructure/auth/jwt-auth.guard";
import { PrismaProcessedEventRepository } from "../infrastructure/database/prisma/prisma-processed-event.repository";
import type { Clock } from "../application/ports/clock";
import type { IdGenerator } from "../application/ports/id-generator";
import type { WalletRepository } from "../application/ports/wallet.repository";
import { WalletCommandProcessor } from "../application/services/wallet-command-processor.service";
import { PrismaOutboxRepository } from "../infrastructure/database/prisma/prisma-outbox.repository";
import { PrismaWalletUnitOfWork } from "../infrastructure/database/prisma/prisma-wallet-unit-of-work";
import { WalletUnitOfWork } from "../application/ports/wallet-unit-of-work";
import { OutboxPublisherService } from "../application/services/outbox-publisher.service";
import { OutboxRepository } from "../application/ports/outbox.repository";
import { OutboxPublisherRunner } from "../infrastructure/outbox/outbox-publisher.runner";
import { WalletResultEventsPublisher } from "../application/ports/wallet-result-events.publisher";
import { WalletEventsConsumer } from "../infrastructure/messaging/rabbitmq/wallet-events.consumer";
import { HealthService } from "../infrastructure/health/health.service";

@Module({
  controllers: [WalletsController],
  providers: [
    PrismaService,
    CryptoIdGenerator,
    SystemClock,
    RabbitMQConnectionService,
    WalletEventsPublisher,
    JwtAuthGuard,
    OutboxPublisherRunner,
    HealthService,
    {
      provide: WALLET_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaWalletRepository(prisma),
      inject: [PrismaService],
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
      provide: CreateWalletUseCase,
      useFactory: (
        walletRepository: WalletRepository,
        idGenerator: IdGenerator,
        clock: Clock,
      ) => new CreateWalletUseCase(walletRepository, idGenerator, clock),
      inject: [WALLET_REPOSITORY, ID_GENERATOR, CLOCK],
    },
    {
      provide: GetWalletByPlayerUseCase,
      useFactory: (walletRepository: WalletRepository) =>
        new GetWalletByPlayerUseCase(walletRepository),
      inject: [WALLET_REPOSITORY],
    },
    {
      provide: CreditWalletUseCase,
      useFactory: (
        walletRepository: WalletRepository,
        idGenerator: IdGenerator,
        clock: Clock,
      ) => new CreditWalletUseCase(walletRepository, idGenerator, clock),
      inject: [WALLET_REPOSITORY, ID_GENERATOR, CLOCK],
    },
    {
      provide: DebitWalletUseCase,
      useFactory: (
        walletRepository: WalletRepository,
        idGenerator: IdGenerator,
        clock: Clock,
      ) => new DebitWalletUseCase(walletRepository, idGenerator, clock),
      inject: [WALLET_REPOSITORY, ID_GENERATOR, CLOCK],
    },
    {
      provide: PROCESSED_EVENT_REPOSITORY,
      useFactory: (prisma: PrismaService) =>
        new PrismaProcessedEventRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: WalletCommandProcessor,
      useFactory: (
        walletUnitOfWork: WalletUnitOfWork,
        idGenerator: IdGenerator,
        clock: Clock,
      ) => new WalletCommandProcessor(walletUnitOfWork, idGenerator, clock),
      inject: [WALLET_UNIT_OF_WORK, ID_GENERATOR, CLOCK],
    },
    {
      provide: OUTBOX_REPOSITORY,
      useFactory: (prisma: PrismaService) => new PrismaOutboxRepository(prisma),
      inject: [PrismaService],
    },
    {
      provide: WALLET_UNIT_OF_WORK,
      useFactory: (prisma: PrismaService) => new PrismaWalletUnitOfWork(prisma),
      inject: [PrismaService],
    },
    {
      provide: OutboxPublisherService,
      useFactory: (
        outboxRepository: OutboxRepository,
        walletEventsPublisher: WalletResultEventsPublisher,
      ) => new OutboxPublisherService(outboxRepository, walletEventsPublisher),
      inject: [OUTBOX_REPOSITORY, WalletEventsPublisher],
    },
    {
      provide: WalletEventsConsumer,
      useFactory: (
        rabbitMq: RabbitMQConnectionService,
        walletCommandProcessor: WalletCommandProcessor,
      ) => new WalletEventsConsumer(rabbitMq, walletCommandProcessor),
      inject: [RabbitMQConnectionService, WalletCommandProcessor],
    },
  ],
})
export class WalletsModule {}
