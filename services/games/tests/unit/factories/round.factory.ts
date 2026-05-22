import { Round } from "../../../src/domain/entities/round.entity";
import { Multiplier } from "../../../src/domain/value-objects/multiplier.vo";

interface CreateTestRoundInput {
  id?: string;
  crashPoint?: Multiplier;
  startsAt?: Date;
  now?: Date;
}

export function createTestRound(input: CreateTestRoundInput = {}): Round {
  const now = input.now ?? new Date("2026-01-01T00:00:00.000Z");

  return Round.create({
    id: input.id ?? "round-1",
    crashPoint: input.crashPoint ?? Multiplier.fromNumber(2),
    serverSeed: "test-server-seed",
    serverSeedHash:
      "985f9e2f40b0c9c81d5d4b5f5e4cbddecd8c6fcfa8e20f6a603ad8d8d8e1f8a1",
    publicSeed: "test-public-seed",
    nonce: 1,
    startsAt: input.startsAt ?? new Date("2026-01-01T00:00:10.000Z"),
    now,
  });
}
