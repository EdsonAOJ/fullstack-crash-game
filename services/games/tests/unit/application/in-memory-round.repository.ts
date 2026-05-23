import { Round } from "../../../src/domain/entities/round.entity";
import { RoundRepository } from "../../../src/application/ports/round.repository";
import { BetProps } from "../../../src/domain/entities/bet.entity";

export class InMemoryRoundRepository implements RoundRepository {
  public rounds: Round[] = [];

  async findBetsByPlayerId(params: {
    playerId: string;
    limit: number;
  }): Promise<BetProps[]> {
    const bets = Array.from(this.rounds.values())
      .flatMap((round) => round.toSnapshot().bets)
      .filter((bet) => bet.playerId === params.playerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, params.limit);

    return bets;
  }

  async findByBetId(betId: string): Promise<Round | null> {
    return (
      this.rounds.find((round) =>
        round.toSnapshot().bets.some((bet) => bet.id === betId),
      ) ?? null
    );
  }

  async findHistory(params: { limit: number }): Promise<Round[]> {
    return this.rounds
      .filter((round) => {
        const status = round.toSnapshot().status;

        return status === "CRASHED" || status === "COMPLETED";
      })
      .slice(0, params.limit);
  }

  async findLatestFinished(): Promise<Round | null> {
    return (
      this.rounds.find((round) => {
        const status = round.toSnapshot().status;

        return status === "CRASHED" || status === "COMPLETED";
      }) ?? null
    );
  }

  async findLatestCrashed(): Promise<Round | null> {
    return (
      this.rounds.find((round) => round.toSnapshot().status === "CRASHED") ??
      null
    );
  }

  async findCurrent(): Promise<Round | null> {
    return (
      this.rounds.find((round) => {
        const status = round.toSnapshot().status;

        return status === "WAITING_FOR_BETS" || status === "RUNNING";
      }) ?? null
    );
  }

  async findById(id: string): Promise<Round | null> {
    return this.rounds.find((round) => round.toSnapshot().id === id) ?? null;
  }

  async save(round: Round): Promise<void> {
    const snapshot = round.toSnapshot();

    const index = this.rounds.findIndex(
      (currentRound) => currentRound.toSnapshot().id === snapshot.id,
    );

    if (index >= 0) {
      this.rounds[index] = round;
      return;
    }

    this.rounds.push(round);
  }
}
