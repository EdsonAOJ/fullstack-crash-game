import { Money } from "../../domain/value-objects/money.vo";
import { WalletNotFoundError } from "../errors/wallet-not-found.error";
import { Clock } from "../ports/clock";
import { IdGenerator } from "../ports/id-generator";
import { WalletRepository } from "../ports/wallet.repository";

export interface DebitWalletInput {
  playerId: string;
  eventId: string;
  amountCents: bigint;
  referenceType?: string;
  referenceId?: string;
}

export interface DebitWalletOutput {
  walletId: string;
  playerId: string;
  balanceCents: string;
}

export class DebitWalletUseCase {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: DebitWalletInput): Promise<DebitWalletOutput> {
    const wallet = await this.walletRepository.findByPlayerId(input.playerId);

    if (!wallet) {
      throw new WalletNotFoundError(input.playerId);
    }

    wallet.debit({
      transactionId: this.idGenerator.generate(),
      eventId: input.eventId,
      amount: Money.fromCents(input.amountCents),
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      occurredAt: this.clock.now(),
    });

    await this.walletRepository.save(wallet);

    const snapshot = wallet.toSnapshot();

    return {
      walletId: snapshot.id,
      playerId: snapshot.playerId,
      balanceCents: snapshot.balance.toCents().toString(),
    };
  }
}
