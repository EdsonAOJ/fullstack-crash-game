import { RoundRepository } from "../ports/round.repository";

export interface GetMyBetsHistoryInput {
  playerId: string;
  limit: number;
}

export interface GetMyBetsHistoryOutput {
  items: Array<{
    id: string;
    roundId: string;
    playerId: string;
    amountCents: string;
    status: string;
    autoCashoutMultiplier?: number;
    cashoutMultiplier?: number;
    payoutCents?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export class GetMyBetsHistoryUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(
    input: GetMyBetsHistoryInput,
  ): Promise<GetMyBetsHistoryOutput> {
    const bets = await this.roundRepository.findBetsByPlayerId({
      playerId: input.playerId,
      limit: input.limit,
    });

    return {
      items: bets.map((bet) => ({
        id: bet.id,
        roundId: bet.roundId,
        playerId: bet.playerId,
        amountCents: bet.amount.toCents().toString(),
        status: bet.status,
        autoCashoutMultiplier: bet.autoCashoutMultiplier?.toNumber(),
        cashoutMultiplier: bet.cashoutMultiplier?.toNumber(),
        payoutCents: bet.payoutCents?.toString(),
        rejectionReason: bet.rejectionReason,
        createdAt: bet.createdAt.toISOString(),
        updatedAt: bet.updatedAt.toISOString(),
      })),
    };
  }
}
