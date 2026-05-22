import { CurrentRoundNotFoundError } from "../errors/current-round-not-found.error";
import { Clock } from "../ports/clock";
import { GameRealtimeNotifier } from "../ports/game-realtime.notifier";
import type { GameUnitOfWork } from "../ports/game-unit-of-work";
import { IdGenerator } from "../ports/id-generator";
import { RoundRepository } from "../ports/round.repository";

export interface CashoutBetInput {
  playerId: string;
}

export interface CashoutBetOutput {
  betId: string;
  roundId: string;
  playerId: string;
  status: string;
  cashoutMultiplier: number;
  payoutCents: string;
}

const WALLET_CREDIT_REQUESTED_EVENT = "wallet.credit.requested";

export class CashoutBetUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly gameUnitOfWork: GameUnitOfWork,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly realtimeNotifier: GameRealtimeNotifier,
  ) {}

  async execute(input: CashoutBetInput): Promise<CashoutBetOutput> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      throw new CurrentRoundNotFoundError();
    }

    const now = this.clock.now();

    const bet = round.cashout(input.playerId, now);
    const snapshot = bet.toSnapshot();

    const payoutCents = snapshot.payoutCents;
    const cashoutMultiplier = snapshot.cashoutMultiplier;

    if (!payoutCents || !cashoutMultiplier) {
      throw new Error("Cashout payout was not calculated.");
    }

    const eventId = this.idGenerator.generate();

    await this.gameUnitOfWork.transaction(async (transaction) => {
      await transaction.roundRepository.save(round);

      await transaction.outboxRepository.save({
        eventId,
        eventName: WALLET_CREDIT_REQUESTED_EVENT,
        payload: {
          eventId,
          eventName: WALLET_CREDIT_REQUESTED_EVENT,
          correlationId: snapshot.id,
          playerId: snapshot.playerId,
          amountCents: payoutCents.toString(),
          referenceId: snapshot.id,
          occurredAt: now.toISOString(),
        },
      });
    });

    this.realtimeNotifier.notifyBetCashedOut({
      id: snapshot.id,
      roundId: snapshot.roundId,
      playerId: snapshot.playerId,
      amountCents: snapshot.amount.toCents().toString(),
      status: snapshot.status,
      cashoutMultiplier: cashoutMultiplier.toNumber(),
      payoutCents: payoutCents.toString(),
      rejectionReason: snapshot.rejectionReason,
    });

    return {
      betId: snapshot.id,
      roundId: snapshot.roundId,
      playerId: snapshot.playerId,
      status: snapshot.status,
      cashoutMultiplier: cashoutMultiplier.toNumber(),
      payoutCents: payoutCents.toString(),
    };
  }
}
