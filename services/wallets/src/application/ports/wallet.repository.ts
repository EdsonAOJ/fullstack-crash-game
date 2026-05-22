import { Wallet } from "../../domain/entities/wallet.entity";

export interface WalletBusinessTransactionReference {
  type: "CREDIT" | "DEBIT";
  referenceType: string;
  referenceId: string;
}

export interface WalletRepository {
  findById(id: string): Promise<Wallet | null>;
  findByPlayerId(playerId: string): Promise<Wallet | null>;
  existsTransactionByBusinessReference(
    reference: WalletBusinessTransactionReference,
  ): Promise<boolean>;
  save(wallet: Wallet): Promise<void>;
}
