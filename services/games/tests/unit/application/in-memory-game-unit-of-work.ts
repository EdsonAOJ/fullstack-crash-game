import type {
  GameTransaction,
  GameUnitOfWork,
} from "../../../src/application/ports/game-unit-of-work";

export class InMemoryGameUnitOfWork implements GameUnitOfWork {
  constructor(private readonly transactionContext: GameTransaction) {}

  async transaction<TOutput>(
    callback: (transaction: GameTransaction) => Promise<TOutput>,
  ): Promise<TOutput> {
    return callback(this.transactionContext);
  }
}
