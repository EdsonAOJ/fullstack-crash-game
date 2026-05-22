import { Wallet } from "../../domain/entities/wallet.entity";

export interface WalletRepository {
  findById(id: string): Promise<Wallet | null>;
  findByPlayerId(playerId: string): Promise<Wallet | null>;
  save(wallet: Wallet): Promise<void>;
}
