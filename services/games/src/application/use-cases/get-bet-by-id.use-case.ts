import { BetNotFoundError } from "../errors/bet-not-found.error";
import type { RoundRepository } from "../ports/round.repository";

export interface GetBetByIdInput {
  betId: string;
  playerId: string;
}

export interface GetBetByIdOutput {
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

export class GetBetByIdUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(input: GetBetByIdInput): Promise<GetBetByIdOutput> {
    const round = await this.roundRepository.findByBetId(input.betId);

    if (!round) {
      throw new BetNotFoundError(input.betId);
    }

    const snapshot = round.toSnapshot();

    const bet = snapshot.bets.find(
      (currentBet) =>
        currentBet.id === input.betId && currentBet.playerId === input.playerId,
    );

    if (!bet) {
      throw new BetNotFoundError(input.betId);
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
