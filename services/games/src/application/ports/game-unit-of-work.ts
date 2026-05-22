import type { OutboxRepository } from "./outbox.repository";
import { ProcessedEventRepository } from "./rocessed-event.repository";
import type { RoundRepository } from "./round.repository";

export interface GameTransaction {
  roundRepository: RoundRepository;
  outboxRepository: OutboxRepository;
  processedEventRepository: ProcessedEventRepository;
}

export interface GameUnitOfWork {
  transaction<TOutput>(
    callback: (transaction: GameTransaction) => Promise<TOutput>,
  ): Promise<TOutput>;
}
