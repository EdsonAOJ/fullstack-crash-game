import type { RoundRepository } from "../ports/round.repository";

export interface GetRoundsHistoryInput {
  limit?: number;
}

export interface GetRoundsHistoryOutput {
  items: Array<{
    id: string;
    status: string;
    crashPoint: number;
    currentMultiplier: number;
    startsAt: string;
    startedAt?: string;
    crashedAt?: string;
    completedAt?: string;
    betsCount: number;
    cashedOutBetsCount: number;
    lostBetsCount: number;
  }>;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export class GetRoundsHistoryUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(
    input: GetRoundsHistoryInput = {},
  ): Promise<GetRoundsHistoryOutput> {
    const limit = this.normalizeLimit(input.limit);

    const rounds = await this.roundRepository.findHistory({
      limit,
    });

    return {
      items: rounds.map((round) => {
        const snapshot = round.toSnapshot();

        return {
          id: snapshot.id,
          status: snapshot.status,
          crashPoint: snapshot.crashPoint.toNumber(),
          currentMultiplier: snapshot.currentMultiplier.toNumber(),
          startsAt: snapshot.startsAt.toISOString(),
          startedAt: snapshot.startedAt?.toISOString(),
          crashedAt: snapshot.crashedAt?.toISOString(),
          completedAt: snapshot.completedAt?.toISOString(),
          betsCount: snapshot.bets.length,
          cashedOutBetsCount: snapshot.bets.filter(
            (bet) => bet.status === "CASHED_OUT",
          ).length,
          lostBetsCount: snapshot.bets.filter((bet) => bet.status === "LOST")
            .length,
        };
      }),
    };
  }

  private normalizeLimit(limit?: number): number {
    if (!limit || !Number.isInteger(limit) || limit <= 0) {
      return DEFAULT_LIMIT;
    }

    return Math.min(limit, MAX_LIMIT);
  }
}
