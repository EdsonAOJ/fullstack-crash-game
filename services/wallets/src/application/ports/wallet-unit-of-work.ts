import type { OutboxRepository } from "./outbox.repository";
import type { ProcessedEventRepository } from "./processed-event.repository";
import type { WalletRepository } from "./wallet.repository";

export interface WalletTransaction {
  walletRepository: WalletRepository;
  processedEventRepository: ProcessedEventRepository;
  outboxRepository: OutboxRepository;
}

export interface WalletUnitOfWork {
  transaction<TOutput>(
    callback: (transaction: WalletTransaction) => Promise<TOutput>,
  ): Promise<TOutput>;
}
