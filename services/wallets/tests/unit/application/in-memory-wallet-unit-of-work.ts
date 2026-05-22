import type {
  WalletTransaction,
  WalletUnitOfWork,
} from "../../../src/application/ports/wallet-unit-of-work";

export class InMemoryWalletUnitOfWork implements WalletUnitOfWork {
  constructor(private readonly transactionContext: WalletTransaction) {}

  async transaction<TOutput>(
    callback: (transaction: WalletTransaction) => Promise<TOutput>,
  ): Promise<TOutput> {
    return callback(this.transactionContext);
  }
}
