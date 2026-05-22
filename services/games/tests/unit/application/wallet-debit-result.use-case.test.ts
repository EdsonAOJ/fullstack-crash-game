import { describe, expect, test } from "bun:test";
import { ConfirmWalletDebitUseCase } from "../../../src/application/use-cases/confirm-wallet-debit.use-case";
import { RejectWalletDebitUseCase } from "../../../src/application/use-cases/reject-wallet-debit.use-case";
import { Bet } from "../../../src/domain/entities/bet.entity";
import { BetAmount } from "../../../src/domain/value-objects/bet-amount.vo";
import { Multiplier } from "../../../src/domain/value-objects/multiplier.vo";
import { FixedClock, InMemoryGameRealtimeNotifier } from "./fakes";
import { InMemoryRoundRepository } from "./in-memory-round.repository";
import { createTestRound } from "../factories/round.factory";

const now = new Date("2026-01-01T00:00:00.000Z");

async function createRoundWithPendingBet(): Promise<{
  repository: InMemoryRoundRepository;
}> {
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

  await repository.save(round);

  return { repository };
}

describe("Wallet debit result use cases", () => {
  test("confirms wallet debit and accepts bet", async () => {
    const { repository } = await createRoundWithPendingBet();
    const realtimeNotifier = new InMemoryGameRealtimeNotifier();

    const useCase = new ConfirmWalletDebitUseCase(
      repository,
      new FixedClock(now),
      realtimeNotifier,
    );

    const output = await useCase.execute({
      betId: "bet-1",
    });

    expect(output).toEqual({
      betId: "bet-1",
      status: "ACCEPTED",
    });

    const round = await repository.findCurrent();

    expect(realtimeNotifier.betAcceptedEvents).toHaveLength(1);
    expect(realtimeNotifier.betAcceptedEvents[0]).toMatchObject({
      id: "bet-1",
      roundId: "round-1",
      playerId: "player",
      amountCents: "1000",
      status: "ACCEPTED",
    });
    expect(round?.toSnapshot().bets[0].status).toBe("ACCEPTED");
  });

  test("rejects wallet debit and rejects bet", async () => {
    const { repository } = await createRoundWithPendingBet();

    const realtimeNotifier = new InMemoryGameRealtimeNotifier();

    const useCase = new RejectWalletDebitUseCase(
      repository,
      new FixedClock(now),
      realtimeNotifier,
    );

    const output = await useCase.execute({
      betId: "bet-1",
      reason: "INSUFFICIENT_BALANCE",
    });

    expect(output).toEqual({
      betId: "bet-1",
      status: "REJECTED",
      rejectionReason: "INSUFFICIENT_BALANCE",
    });

    const round = await repository.findCurrent();

    expect(realtimeNotifier.betRejectedEvents).toHaveLength(1);
    expect(realtimeNotifier.betRejectedEvents[0]).toMatchObject({
      id: "bet-1",
      roundId: "round-1",
      playerId: "player",
      amountCents: "1000",
      status: "REJECTED",
      rejectionReason: "INSUFFICIENT_BALANCE",
    });
    expect(round?.toSnapshot().bets[0].status).toBe("REJECTED");
  });
});
