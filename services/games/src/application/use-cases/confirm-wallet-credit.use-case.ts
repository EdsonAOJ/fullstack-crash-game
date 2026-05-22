import { BetNotFoundError } from "../errors/bet-not-found.error";
import { Clock } from "../ports/clock";
import { GameRealtimeNotifier } from "../ports/game-realtime.notifier";
import { RoundRepository } from "../ports/round.repository";

export interface ConfirmWalletCreditInput {
  betId: string;
}

export interface ConfirmWalletCreditOutput {
  betId: string;
  status: string;
}

export class ConfirmWalletCreditUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly clock: Clock,
    private readonly realtimeNotifier: GameRealtimeNotifier,
  ) {}

  async execute(
    input: ConfirmWalletCreditInput,
  ): Promise<ConfirmWalletCreditOutput> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      throw new BetNotFoundError(input.betId);
    }

    const bet = round.confirmBetCashoutCredit(input.betId, this.clock.now());

    await this.roundRepository.save(round);

    const snapshot = bet.toSnapshot();

    this.realtimeNotifier.notifyBetCashedOut({
      id: snapshot.id,
      roundId: snapshot.roundId,
      playerId: snapshot.playerId,
      amountCents: snapshot.amount.toCents().toString(),
      status: snapshot.status,
      cashoutMultiplier: snapshot.cashoutMultiplier?.toNumber(),
      payoutCents: snapshot.payoutCents?.toString(),
      rejectionReason: snapshot.rejectionReason,
    });

    return {
      betId: snapshot.id,
      status: snapshot.status,
    };
  }
}
