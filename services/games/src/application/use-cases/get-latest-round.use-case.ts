import { LatestRoundNotFoundError } from "../errors/latest-round-not-found.error";
import type { RoundRepository } from "../ports/round.repository";

export interface GetLatestRoundOutput {
  id: string;
  status: string;
  crashPoint: number;
  currentMultiplier: number;
  startsAt: string;
  startedAt?: string;
  crashedAt?: string;
  completedAt?: string;
  bets: Array<{
    id: string;
    playerId: string;
    amountCents: string;
    status: string;
    cashoutMultiplier?: number;
    payoutCents?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export class GetLatestRoundUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(): Promise<GetLatestRoundOutput> {
    const round = await this.roundRepository.findLatestFinished();

    if (!round) {
      throw new LatestRoundNotFoundError();
    }

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
      bets: snapshot.bets.map((bet) => ({
        id: bet.id,
        playerId: bet.playerId,
        amountCents: bet.amount.toCents().toString(),
        status: bet.status,
        cashoutMultiplier: bet.cashoutMultiplier?.toNumber(),
        payoutCents: bet.payoutCents?.toString(),
        rejectionReason: bet.rejectionReason,
        createdAt: bet.createdAt.toISOString(),
        updatedAt: bet.updatedAt.toISOString(),
      })),
    };
  }
}
