import type {
  GameTransaction,
  GameUnitOfWork,
} from "../../../application/ports/game-unit-of-work";
import { PrismaOutboxRepository } from "./prisma-outbox.repository";
import { PrismaProcessedEventRepository } from "./prisma-processed-event.repository";
import { PrismaRoundRepository } from "./prisma-round.repository";
import { PrismaService } from "./prisma.service";

export class PrismaGameUnitOfWork implements GameUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async transaction<TOutput>(
    callback: (transaction: GameTransaction) => Promise<TOutput>,
  ): Promise<TOutput> {
    return this.prisma.$transaction(async (prismaTransaction) => {
      const roundRepository = new PrismaRoundRepository(prismaTransaction);
      const outboxRepository = new PrismaOutboxRepository(prismaTransaction);
      const processedEventRepository = new PrismaProcessedEventRepository(
        prismaTransaction,
      );

      return callback({
        roundRepository,
        outboxRepository,
        processedEventRepository,
      });
    });
  }
}
