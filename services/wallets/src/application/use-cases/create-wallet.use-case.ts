import { Wallet } from "../../domain/entities/wallet.entity";
import { Money } from "../../domain/value-objects/money.vo";
import { WalletAlreadyExistsError } from "../errors/wallet-already-exists.error";
import { Clock } from "../ports/clock";
import { IdGenerator } from "../ports/id-generator";
import { WalletRepository } from "../ports/wallet.repository";

export interface CreateWalletInput {
  playerId: string;
}

export interface CreateWalletOutput {
  id: string;
  playerId: string;
  balanceCents: string;
}

export class CreateWalletUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateWalletInput): Promise<CreateWalletOutput> {
    const existingWallet = await this.walletRepository.findByPlayerId(
      input.playerId,
    );

    if (existingWallet) {
      throw new WalletAlreadyExistsError(input.playerId);
    }

    const wallet = Wallet.create({
      id: this.idGenerator.generate(),
      playerId: input.playerId,
      initialBalance: Money.zero(),
      now: this.clock.now(),
    });

    await this.walletRepository.save(wallet);

    const snapshot = wallet.toSnapshot();

    return {
      id: snapshot.id,
      playerId: snapshot.playerId,
      balanceCents: snapshot.balance.toCents().toString(),
    };
  }
}
