import { Injectable } from "@nestjs/common";
import type {
  LeaderboardItem,
  LeaderboardRepository,
} from "../../../application/ports/leaderboard.repository";
import type { PrismaClientLike } from "./prisma-client";

interface LeaderboardRawRow {
  playerId: string;
  betsCount: bigint;
  cashoutsCount: bigint;
  lostBetsCount: bigint;
  totalWageredCents: bigint;
  totalPayoutCents: bigint;
  totalProfitCents: bigint;
}

@Injectable()
export class PrismaLeaderboardRepository implements LeaderboardRepository {
  constructor(private readonly prisma: PrismaClientLike) {}

  async findTopPlayers(params: { limit: number }): Promise<LeaderboardItem[]> {
    const rows = await this.prisma.$queryRaw<LeaderboardRawRow[]>`
      SELECT
        "playerId",
        COUNT(*)::bigint AS "betsCount",
        COUNT(*) FILTER (WHERE status = 'CASHED_OUT')::bigint AS "cashoutsCount",
        COUNT(*) FILTER (WHERE status = 'LOST')::bigint AS "lostBetsCount",
        COALESCE(SUM("amountCents"), 0)::bigint AS "totalWageredCents",
        COALESCE(SUM(COALESCE("payoutCents", 0)), 0)::bigint AS "totalPayoutCents",
        (
          COALESCE(SUM(COALESCE("payoutCents", 0)), 0) -
          COALESCE(SUM("amountCents"), 0)
        )::bigint AS "totalProfitCents"
      FROM bets
      WHERE status IN ('CASHED_OUT', 'LOST')
      GROUP BY "playerId"
      ORDER BY "totalProfitCents" DESC, "totalPayoutCents" DESC
      LIMIT ${params.limit};
    `;

    return rows.map((row) => ({
      playerId: row.playerId,
      betsCount: Number(row.betsCount),
      cashoutsCount: Number(row.cashoutsCount),
      lostBetsCount: Number(row.lostBetsCount),
      totalWageredCents: row.totalWageredCents,
      totalPayoutCents: row.totalPayoutCents,
      totalProfitCents: row.totalProfitCents,
    }));
  }
}
