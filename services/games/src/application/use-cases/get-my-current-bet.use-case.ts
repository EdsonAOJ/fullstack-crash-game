import { CurrentBetNotFoundError } from "../errors/current-bet-not-found.error";
import { CurrentRoundNotFoundError } from "../errors/current-round-not-found.error";
import { RoundRepository } from "../ports/round.repository";

export interface GetMyCurrentBetInput {
  playerId: string;
}

export interface GetMyCurrentBetOutput {
  betId: string;
  roundId: string;
  playerId: string;
  amountCents: string;
  status: string;
  cashoutMultiplier?: number;
  payoutCents?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export class GetMyCurrentBetUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(input: GetMyCurrentBetInput): Promise<GetMyCurrentBetOutput> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      throw new CurrentRoundNotFoundError();
    }

    const snapshot = round.toSnapshot();

    const bet = snapshot.bets.find(
      (currentBet) => currentBet.playerId === input.playerId,
    );

    if (!bet) {
      throw new CurrentBetNotFoundError(input.playerId);
    }

    return {
      betId: bet.id,
      roundId: bet.roundId,
      playerId: bet.playerId,
      amountCents: bet.amount.toCents().toString(),
      status: bet.status,
      cashoutMultiplier: bet.cashoutMultiplier?.toNumber(),
      payoutCents: bet.payoutCents?.toString(),
      rejectionReason: bet.rejectionReason,
      createdAt: bet.createdAt.toISOString(),
      updatedAt: bet.updatedAt.toISOString(),
    };
  }
}
