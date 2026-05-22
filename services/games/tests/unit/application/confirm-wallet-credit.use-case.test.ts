import { describe, expect, test } from "bun:test";
import { ConfirmWalletCreditUseCase } from "../../../src/application/use-cases/confirm-wallet-credit.use-case";
import { Bet } from "../../../src/domain/entities/bet.entity";
import { BetAmount } from "../../../src/domain/value-objects/bet-amount.vo";
import { Multiplier } from "../../../src/domain/value-objects/multiplier.vo";
import { FixedClock, InMemoryGameRealtimeNotifier } from "./fakes";
import { InMemoryRoundRepository } from "./in-memory-round.repository";
import { createTestRound } from "../factories/round.factory";

const now = new Date("2026-01-01T00:00:00.000Z");

async function createRoundWithPendingCashout(): Promise<InMemoryRoundRepository> {
  const repository = new InMemoryRoundRepository();

  const round = createTestRound({
    id: "round-1",
    crashPoint: Multiplier.fromNumber(2),
    startsAt: new Date("2026-01-01T00:00:10.000Z"),
    now,
  });

  const bet = Bet.place({
    id: "bet-1",
    roundId: "round-1",
    playerId: "player",
    amount: BetAmount.fromCents(1000n),
    now,
  });

  round.placeBet(bet);
  bet.acceptDebit(now);

  round.start(now);
  round.updateMultiplier(Multiplier.fromNumber(1.5), now);
  round.cashout("player", now);

  await repository.save(round);

  return repository;
}

describe("ConfirmWalletCreditUseCase", () => {
  test("confirms wallet credit and marks bet as cashed out", async () => {
    const repository = await createRoundWithPendingCashout();

    const realtimeNotifier = new InMemoryGameRealtimeNotifier();

    const useCase = new ConfirmWalletCreditUseCase(
      repository,
      new FixedClock(now),
      realtimeNotifier,
    );

    const output = await useCase.execute({
      betId: "bet-1",
    });

    expect(output).toEqual({
      betId: "bet-1",
      status: "CASHED_OUT",
    });

    const round = await repository.findCurrent();

    expect(realtimeNotifier.betCashedOutEvents).toHaveLength(1);
    expect(realtimeNotifier.betCashedOutEvents[0]).toMatchObject({
      id: "bet-1",
      roundId: "round-1",
      playerId: "player",
      amountCents: "1000",
      status: "CASHED_OUT",
      cashoutMultiplier: 1.5,
      payoutCents: "1500",
    });
    expect(round?.toSnapshot().bets[0].status).toBe("CASHED_OUT");
  });
});
