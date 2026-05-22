import { describe, expect, test } from "bun:test";
import {
  WalletResultProcessor,
  type WalletResultEvent,
} from "../../../src/application/services/wallet-result-processor.service";
import { Bet } from "../../../src/domain/entities/bet.entity";
import { BetAmount } from "../../../src/domain/value-objects/bet-amount.vo";
import { Multiplier } from "../../../src/domain/value-objects/multiplier.vo";
import { FixedClock, InMemoryGameRealtimeNotifier } from "./fakes";
import { InMemoryGameUnitOfWork } from "./in-memory-game-unit-of-work";
import { InMemoryOutboxRepository } from "./in-memory-outbox.repository";
import { InMemoryProcessedEventRepository } from "./in-memory-processed-event.repository";
import { InMemoryRoundRepository } from "./in-memory-round.repository";
import { createTestRound } from "../factories/round.factory";

const now = new Date("2026-01-01T00:00:00.000Z");

function createWalletDebitedEvent(params: {
  eventId: string;
  betId: string;
  playerId: string;
  amountCents: string;
  balanceCents: string;
}): WalletResultEvent {
  return {
    metadata: {
      eventId: params.eventId,
      eventName: "wallet.debited",
      correlationId: params.betId,
      causationId: "wallet-debit-request-event-id",
      occurredAt: now.toISOString(),
    },
    payload: {
      playerId: params.playerId,
      walletId: "wallet-1",
      amountCents: params.amountCents,
      balanceCents: params.balanceCents,
      referenceType: "BET",
      referenceId: params.betId,
    },
  } as WalletResultEvent;
}

function createWalletDebitRejectedEvent(params: {
  eventId: string;
  betId: string;
  playerId: string;
  amountCents: string;
  reason: string;
}): WalletResultEvent {
  return {
    metadata: {
      eventId: params.eventId,
      eventName: "wallet.debit.rejected",
      correlationId: params.betId,
      causationId: "wallet-debit-request-event-id",
      occurredAt: now.toISOString(),
    },
    payload: {
      playerId: params.playerId,
      amountCents: params.amountCents,
      reason: params.reason,
      referenceType: "BET",
      referenceId: params.betId,
    },
  } as WalletResultEvent;
}

function createProcessorContext() {
  const roundRepository = new InMemoryRoundRepository();
  const outboxRepository = new InMemoryOutboxRepository();
  const processedEventRepository = new InMemoryProcessedEventRepository();
  const realtimeNotifier = new InMemoryGameRealtimeNotifier();

  const gameUnitOfWork = new InMemoryGameUnitOfWork({
    roundRepository,
    outboxRepository,
    processedEventRepository,
  });

  const processor = new WalletResultProcessor(
    gameUnitOfWork,
    new FixedClock(now),
    realtimeNotifier,
  );

  return {
    processor,
    roundRepository,
    processedEventRepository,
    realtimeNotifier,
  };
}

function createRoundWithPendingDebitBet() {
  const round = createTestRound({
    id: "round-1",
    crashPoint: Multiplier.fromNumber(2),
    startsAt: new Date("2026-01-01T00:00:10.000Z"),
    now,
  });

  const bet = Bet.place({
    id: "bet-1",
    roundId: "round-1",
    playerId: "player-1",
    amount: BetAmount.fromCents(1000n),
    now,
  });

  round.placeBet(bet);

  return round;
}

describe("WalletResultProcessor", () => {
  test("processes wallet debited only once for the same event id", async () => {
    const { processor, roundRepository, processedEventRepository } =
      createProcessorContext();

    const round = createRoundWithPendingDebitBet();

    await roundRepository.save(round);

    const event = createWalletDebitedEvent({
      eventId: "wallet-result-event-1",
      betId: "bet-1",
      playerId: "player-1",
      amountCents: "1000",
      balanceCents: "9000",
    });

    await processor.process(event);
    await processor.process(event);

    const savedRound = await roundRepository.findCurrent();
    const snapshot = savedRound?.toSnapshot();

    expect(snapshot?.bets).toHaveLength(1);
    expect(snapshot?.bets[0]?.id).toBe("bet-1");
    expect(snapshot?.bets[0]?.status).toBe("ACCEPTED");

    expect(processedEventRepository.processedEvents).toEqual([
      {
        eventId: "wallet-result-event-1",
        eventName: "wallet.debited",
      },
    ]);
  });

  test("processes wallet debit rejected only once for the same event id", async () => {
    const { processor, roundRepository, processedEventRepository } =
      createProcessorContext();

    const round = createRoundWithPendingDebitBet();

    await roundRepository.save(round);

    const event = createWalletDebitRejectedEvent({
      eventId: "wallet-result-event-2",
      betId: "bet-1",
      playerId: "player-1",
      amountCents: "1000",
      reason: "INSUFFICIENT_BALANCE",
    });

    await processor.process(event);
    await processor.process(event);

    const savedRound = await roundRepository.findCurrent();
    const snapshot = savedRound?.toSnapshot();

    expect(snapshot?.bets).toHaveLength(1);
    expect(snapshot?.bets[0]?.id).toBe("bet-1");
    expect(snapshot?.bets[0]?.status).toBe("REJECTED");
    expect(snapshot?.bets[0]?.rejectionReason).toBe("INSUFFICIENT_BALANCE");

    expect(processedEventRepository.processedEvents).toEqual([
      {
        eventId: "wallet-result-event-2",
        eventName: "wallet.debit.rejected",
      },
    ]);
  });
});
