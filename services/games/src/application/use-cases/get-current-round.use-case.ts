import { CurrentRoundNotFoundError } from "../errors/current-round-not-found.error";
import { RoundRepository } from "../ports/round.repository";

export interface GetCurrentRoundOutput {
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

export class GetCurrentRoundUseCase {
  constructor(private readonly roundRepository: RoundRepository) {}

  async execute(): Promise<GetCurrentRoundOutput> {
    const round = await this.roundRepository.findCurrent();

    if (!round) {
      throw new CurrentRoundNotFoundError();
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
