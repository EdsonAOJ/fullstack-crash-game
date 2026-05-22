import { Bet } from "../../domain/entities/bet.entity";
import { BetAmount } from "../../domain/value-objects/bet-amount.vo";
import { CurrentRoundNotFoundError } from "../errors/current-round-not-found.error";
import { Clock } from "../ports/clock";
import { GameRealtimeNotifier } from "../ports/game-realtime.notifier";
import type { GameUnitOfWork } from "../ports/game-unit-of-work";
import { IdGenerator } from "../ports/id-generator";
import { RoundRepository } from "../ports/round.repository";

export interface PlaceBetInput {
  playerId: string;
  amountCents: bigint;
}

export interface PlaceBetOutput {
  betId: string;
  roundId: string;
  playerId: string;
  amountCents: string;
  status: string;
}

const WALLET_DEBIT_REQUESTED_EVENT = "wallet.debit.requested";

export class PlaceBetUseCase {
  constructor(
    private readonly roundRepository: RoundRepository,
    private readonly gameUnitOfWork: GameUnitOfWork,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
    private readonly realtimeNotifier: GameRealtimeNotifier,
  ) {}

  async execute(input: PlaceBetInput): Promise<PlaceBetOutput> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      throw new CurrentRoundNotFoundError();
    }

    const betId = this.idGenerator.generate();
    const eventId = this.idGenerator.generate();
    const now = this.clock.now();

    const bet = Bet.place({
      id: betId,
      roundId: round.toSnapshot().id,
      playerId: input.playerId,
      amount: BetAmount.fromCents(input.amountCents),
      now,
    });

    round.placeBet(bet);

    const snapshot = bet.toSnapshot();

    await this.gameUnitOfWork.transaction(async (transaction) => {
      await transaction.roundRepository.save(round);

      await transaction.outboxRepository.save({
        eventId,
        eventName: WALLET_DEBIT_REQUESTED_EVENT,
        payload: {
          eventId,
          eventName: WALLET_DEBIT_REQUESTED_EVENT,
          correlationId: betId,
          playerId: input.playerId,
          amountCents: input.amountCents.toString(),
          referenceId: betId,
          occurredAt: now.toISOString(),
        },
      });
    });

    this.realtimeNotifier.notifyBetPlaced({
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
      roundId: snapshot.roundId,
      playerId: snapshot.playerId,
      amountCents: snapshot.amount.toCents().toString(),
      status: snapshot.status,
    };
  }
}
