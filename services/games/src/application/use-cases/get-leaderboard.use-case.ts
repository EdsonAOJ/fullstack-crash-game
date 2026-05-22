import type { LeaderboardRepository } from "../ports/leaderboard.repository";

export interface GetLeaderboardInput {
  limit: number;
}

export interface GetLeaderboardOutput {
  items: Array<{
    playerId: string;
    betsCount: number;
    cashoutsCount: number;
    lostBetsCount: number;
    totalWageredCents: string;
    totalPayoutCents: string;
    totalProfitCents: string;
  }>;
}

export class GetLeaderboardUseCase {
  constructor(private readonly leaderboardRepository: LeaderboardRepository) {}

  async execute(input: GetLeaderboardInput): Promise<GetLeaderboardOutput> {
    const items = await this.leaderboardRepository.findTopPlayers({
      limit: input.limit,
    });

    return {
      items: items.map((item) => ({
        playerId: item.playerId,
        betsCount: item.betsCount,
        cashoutsCount: item.cashoutsCount,
        lostBetsCount: item.lostBetsCount,
        totalWageredCents: item.totalWageredCents.toString(),
        totalPayoutCents: item.totalPayoutCents.toString(),
        totalProfitCents: item.totalProfitCents.toString(),
      })),
    };
  }
}
