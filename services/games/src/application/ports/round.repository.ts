import { Round } from "../../domain/entities/round.entity";

export interface RoundRepository {
  findCurrent(): Promise<Round | null>;
  findLatestCrashed(): Promise<Round | null>;
  findLatestFinished(): Promise<Round | null>;
  findHistory(params: { limit: number }): Promise<Round[]>;
  findById(id: string): Promise<Round | null>;
  findByBetId(betId: string): Promise<Round | null>;
  save(round: Round): Promise<void>;
}
