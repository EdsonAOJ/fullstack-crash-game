export interface LeaderboardItem {
  playerId: string;
  betsCount: number;
  cashoutsCount: number;
  lostBetsCount: number;
  totalWageredCents: bigint;
  totalPayoutCents: bigint;
  totalProfitCents: bigint;
}

export interface LeaderboardRepository {
  findTopPlayers(params: { limit: number }): Promise<LeaderboardItem[]>;
}
