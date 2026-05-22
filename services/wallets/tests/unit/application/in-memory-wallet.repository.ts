import { Wallet } from "../../../src/domain/entities/wallet.entity";
import { WalletRepository } from "../../../src/application/ports/wallet.repository";

export class InMemoryWalletRepository implements WalletRepository {
  public readonly wallets: Wallet[] = [];

  async existsTransactionByBusinessReference(reference: {
    type: "CREDIT" | "DEBIT";
    referenceType: string;
    referenceId: string;
  }): Promise<boolean> {
    for (const wallet of this.wallets.values()) {
      const snapshot = wallet.toSnapshot();

      const transactionExists = snapshot.transactions.some(
        (transaction) =>
          transaction.type === reference.type &&
          transaction.referenceType === reference.referenceType &&
          transaction.referenceId === reference.referenceId,
      );

      if (transactionExists) {
        return true;
      }
    }

    return false;
  }

  async findById(id: string): Promise<Wallet | null> {
    return this.wallets.find((wallet) => wallet.toSnapshot().id === id) ?? null;
  }

  async findByPlayerId(playerId: string): Promise<Wallet | null> {
    return (
      this.wallets.find(
        (wallet) => wallet.toSnapshot().playerId === playerId,
      ) ?? null
    );
  }

  async save(wallet: Wallet): Promise<void> {
    const snapshot = wallet.toSnapshot();

    const index = this.wallets.findIndex(
      (currentWallet) => currentWallet.toSnapshot().id === snapshot.id,
    );

    if (index >= 0) {
      this.wallets[index] = wallet;
      return;
    }

    this.wallets.push(wallet);
  }
}
