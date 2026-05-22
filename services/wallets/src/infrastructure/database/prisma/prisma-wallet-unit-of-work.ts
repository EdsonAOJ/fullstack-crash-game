import type {
  WalletTransaction,
  WalletUnitOfWork,
} from "../../../application/ports/wallet-unit-of-work";
import { PrismaOutboxRepository } from "./prisma-outbox.repository";
import { PrismaProcessedEventRepository } from "./prisma-processed-event.repository";
import { PrismaWalletRepository } from "./prisma-wallet.repository";
import { PrismaService } from "./prisma.service";

export class PrismaWalletUnitOfWork implements WalletUnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  async transaction<TOutput>(
    callback: (transaction: WalletTransaction) => Promise<TOutput>,
  ): Promise<TOutput> {
    return this.prisma.$transaction(async (prismaTransaction) => {
      const walletRepository = new PrismaWalletRepository(prismaTransaction);
      const processedEventRepository = new PrismaProcessedEventRepository(
        prismaTransaction,
      );
      const outboxRepository = new PrismaOutboxRepository(prismaTransaction);

      return callback({
        walletRepository,
        processedEventRepository,
        outboxRepository,
      });
    });
  }
}
