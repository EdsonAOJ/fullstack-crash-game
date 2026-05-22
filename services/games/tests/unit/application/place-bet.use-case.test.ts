import { describe, expect, test } from "bun:test";
import { CurrentRoundNotFoundError } from "../../../src/application/errors/current-round-not-found.error";
import { PlaceBetUseCase } from "../../../src/application/use-cases/place-bet.use-case";
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

describe("PlaceBetUseCase", () => {
  test("places a bet and stores wallet debit request in outbox", async () => {
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
      startsAt: new Date("2026-01-01T00:00:10.000Z"),
      now,
    });

    await roundRepository.save(round);

    const useCase = new PlaceBetUseCase(
      roundRepository,
      gameUnitOfWork,
      idGenerator,
      clock,
      realtimeNotifier,
    );

    const output = await useCase.execute({
      playerId: "player",
      amountCents: 1000n,
    });

    expect(output).toEqual({
      betId: "id-1",
      roundId: "round-1",
      playerId: "player",
      amountCents: "1000",
      status: "PENDING_DEBIT",
    });

    expect(realtimeNotifier.betPlacedEvents).toHaveLength(1);
    expect(realtimeNotifier.betPlacedEvents[0]).toMatchObject({
      id: "id-1",
      roundId: "round-1",
      playerId: "player",
      amountCents: "1000",
      status: "PENDING_DEBIT",
    });

    expect(outboxRepository.savedEvents).toHaveLength(1);
    expect(outboxRepository.savedEvents[0]).toMatchObject({
      eventId: "id-2",
      eventName: "wallet.debit.requested",
      payload: {
        eventId: "id-2",
        eventName: "wallet.debit.requested",
        correlationId: "id-1",
        playerId: "player",
        amountCents: "1000",
        referenceId: "id-1",
        occurredAt: now.toISOString(),
      },
    });

    const savedRound = await roundRepository.findCurrent();
    const savedRoundSnapshot = savedRound?.toSnapshot();

    expect(savedRoundSnapshot?.bets).toHaveLength(1);
    expect(savedRoundSnapshot?.bets[0]?.id).toBe("id-1");
    expect(savedRoundSnapshot?.bets[0]?.playerId).toBe("player");
    expect(savedRoundSnapshot?.bets[0]?.amount.toCents()).toBe(1000n);
    expect(savedRoundSnapshot?.bets[0]?.status).toBe("PENDING_DEBIT");
  });

  test("throws when current round does not exist", async () => {
    const roundRepository = new InMemoryRoundRepository();
    const outboxRepository = new InMemoryOutboxRepository();
    const realtimeNotifier = new InMemoryGameRealtimeNotifier();
    const processedEventRepository = new InMemoryProcessedEventRepository();

    const gameUnitOfWork = new InMemoryGameUnitOfWork({
      roundRepository,
      outboxRepository,
      processedEventRepository,
    });

    const useCase = new PlaceBetUseCase(
      roundRepository,
      gameUnitOfWork,
      new SequentialIdGenerator(),
      new FixedClock(now),
      realtimeNotifier,
    );

    await expect(
      useCase.execute({
        playerId: "player",
        amountCents: 1000n,
      }),
    ).rejects.toThrow(CurrentRoundNotFoundError);

    expect(outboxRepository.savedEvents).toHaveLength(0);
    expect(realtimeNotifier.betPlacedEvents).toHaveLength(0);
  });
});
