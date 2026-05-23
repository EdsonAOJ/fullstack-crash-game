import { BetProps } from "../../domain/entities/bet.entity";
import { Round } from "../../domain/entities/round.entity";

export interface RoundRepository {
  findCurrent(): Promise<Round | null>;
  findLatestCrashed(): Promise<Round | null>;
  findLatestFinished(): Promise<Round | null>;
  findHistory(params: { limit: number }): Promise<Round[]>;
  findBetsByPlayerId(params: {
    playerId: string;
    limit: number;
  }): Promise<BetProps[]>;
  findById(id: string): Promise<Round | null>;
  findByBetId(betId: string): Promise<Round | null>;
  save(round: Round): Promise<void>;
}
