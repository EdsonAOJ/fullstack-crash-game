import { WalletNotFoundError } from "../errors/wallet-not-found.error";
import { WalletRepository } from "../ports/wallet.repository";

export interface GetWalletByPlayerInput {
  playerId: string;
}

export interface GetWalletByPlayerOutput {
  id: string;
  playerId: string;
  balanceCents: string;
}

export class GetWalletByPlayerUseCase {
  constructor(private readonly walletRepository: WalletRepository) {}

  async execute(
    input: GetWalletByPlayerInput,
  ): Promise<GetWalletByPlayerOutput> {
    const wallet = await this.walletRepository.findByPlayerId(input.playerId);

    if (!wallet) {
      throw new WalletNotFoundError(input.playerId);
    }

    const snapshot = wallet.toSnapshot();

    return {
      id: snapshot.id,
      playerId: snapshot.playerId,
      balanceCents: snapshot.balance.toCents().toString(),
    };
  }
}
