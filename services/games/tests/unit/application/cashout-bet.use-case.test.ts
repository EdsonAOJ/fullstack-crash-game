import { describe, expect, test } from "bun:test";
import { CashoutBetUseCase } from "../../../src/application/use-cases/cashout-bet.use-case";
import { Bet } from "../../../src/domain/entities/bet.entity";
import { BetAmount } from "../../../src/domain/value-objects/bet-amount.vo";
import { Multiplier } from "../../../src/domain/value-objects/multiplier.vo";
import {
  FixedClock,
  InMemoryGameRealtimeNotifier,
  SequentialIdGenerator,
} from "./fakes";
import { InMemoryGameUnitOfWork } from "./in-memory-game-unit-of-work";
import { InMemoryOutboxRepository } from "./in-memory-outbox.repository";
import { InMemoryRoundRepository } from "./in-memory-round.repository";
import { createTestRound } from "../factories/round.factory";
import { InMemoryProcessedEventRepository } from "./in-memory-processed-event.repository";

const now = new Date("2026-01-01T00:00:00.000Z");

describe("CashoutBetUseCase", () => {
  test("requests cashout and stores wallet credit request in outbox", async () => {
    const roundRepository = new InMemoryRoundRepository();
    const outboxRepository = new InMemoryOutboxRepository();
    const idGenerator = new SequentialIdGenerator();
    const clock = new FixedClock(now);
    const realtimeNotifier = new InMemoryGameRealtimeNotifier();
    const processedEventRepository = new InMemoryProcessedEventRepository();

    const gameUnitOfWork = new InMemoryGameUnitOfWork({
      roundRepository,
      outboxRepository,
      processedEventRepository,
    });

    const round = createTestRound({
      id: "round-1",
      crashPoint: Multiplier.fromNumber(2),
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
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
    round.confirmBetDebit("bet-1", now);
    round.start(now);
    round.updateMultiplier(Multiplier.fromNumber(1.5), now);

    await roundRepository.save(round);

    const useCase = new CashoutBetUseCase(
      roundRepository,
      gameUnitOfWork,
      idGenerator,
      clock,
      realtimeNotifier,
    );

    const output = await useCase.execute({
      playerId: "player",
    });

    expect(output).toEqual({
      betId: "bet-1",
      roundId: "round-1",
      playerId: "player",
      status: "CASHED_OUT_PENDING_CREDIT",
      cashoutMultiplier: 1.5,
      payoutCents: "1500",
    });

    expect(outboxRepository.savedEvents).toHaveLength(1);

    expect(outboxRepository.savedEvents[0]).toMatchObject({
      eventId: "id-1",
      eventName: "wallet.credit.requested",
      payload: {
        eventId: "id-1",
        eventName: "wallet.credit.requested",
        correlationId: "bet-1",
        playerId: "player",
        amountCents: "1500",
        referenceId: "bet-1",
        occurredAt: now.toISOString(),
      },
    });

    expect(realtimeNotifier.betCashedOutEvents).toHaveLength(1);

    expect(realtimeNotifier.betCashedOutEvents[0]).toMatchObject({
      id: "bet-1",
      roundId: "round-1",
      playerId: "player",
      amountCents: "1000",
      status: "CASHED_OUT_PENDING_CREDIT",
      cashoutMultiplier: 1.5,
      payoutCents: "1500",
    });

    const savedRound = await roundRepository.findCurrent();
    const savedRoundSnapshot = savedRound?.toSnapshot();

    expect(savedRoundSnapshot?.bets).toHaveLength(1);
    expect(savedRoundSnapshot?.bets[0]?.id).toBe("bet-1");
    expect(savedRoundSnapshot?.bets[0]?.status).toBe(
      "CASHED_OUT_PENDING_CREDIT",
    );
    expect(savedRoundSnapshot?.bets[0]?.cashoutMultiplier?.toNumber()).toBe(
      1.5,
    );
    expect(savedRoundSnapshot?.bets[0]?.payoutCents?.toString()).toBe("1500");
  });
});
