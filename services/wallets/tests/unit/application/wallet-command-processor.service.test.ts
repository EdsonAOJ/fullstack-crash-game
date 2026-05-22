import { describe, expect, test } from "bun:test";
import {
  WalletCommandProcessor,
  type WalletCommandEvent,
} from "../../../src/application/services/wallet-command-processor.service";
import { Wallet } from "../../../src/domain/entities/wallet.entity";
import { Money } from "../../../src/domain/value-objects/money.vo";
import { FixedClock, SequentialIdGenerator } from "./fakes";
import { InMemoryOutboxRepository } from "./in-memory-outbox.repository";
import { InMemoryProcessedEventRepository } from "./in-memory-processed-event.repository";
import { InMemoryWalletRepository } from "./in-memory-wallet.repository";
import { InMemoryWalletUnitOfWork } from "./in-memory-wallet-unit-of-work";

const now = new Date("2026-01-01T00:00:00.000Z");

function createDebitRequestedEvent(params: {
  eventId: string;
  playerId: string;
  amountCents: string;
  referenceId: string;
}): WalletCommandEvent {
  return {
    metadata: {
      eventId: params.eventId,
      eventName: "wallet.debit.requested",
      correlationId: params.referenceId,
      occurredAt: now.toISOString(),
    },
    payload: {
      playerId: params.playerId,
      amountCents: params.amountCents,
      referenceType: "BET",
      referenceId: params.referenceId,
    },
  } as WalletCommandEvent;
}

function createCreditRequestedEvent(params: {
  eventId: string;
  playerId: string;
  amountCents: string;
  referenceId: string;
}): WalletCommandEvent {
  return {
    metadata: {
      eventId: params.eventId,
      eventName: "wallet.credit.requested",
      correlationId: params.referenceId,
      occurredAt: now.toISOString(),
    },
    payload: {
      playerId: params.playerId,
      amountCents: params.amountCents,
      referenceType: "CASHOUT",
      referenceId: params.referenceId,
    },
  } as WalletCommandEvent;
}

function createProcessorContext() {
  const walletRepository = new InMemoryWalletRepository();
  const processedEventRepository = new InMemoryProcessedEventRepository();
  const outboxRepository = new InMemoryOutboxRepository();

  const walletUnitOfWork = new InMemoryWalletUnitOfWork({
    walletRepository,
    processedEventRepository,
    outboxRepository,
  });

  const idGenerator = new SequentialIdGenerator();
  const clock = new FixedClock(now);

  const processor = new WalletCommandProcessor(
    walletUnitOfWork,
    idGenerator,
    clock,
  );

  return {
    processor,
    walletRepository,
    processedEventRepository,
    outboxRepository,
    clock,
  };
}

describe("WalletCommandProcessor", () => {
  test("processes wallet debit requested only once for the same event id", async () => {
    const {
      processor,
      walletRepository,
      processedEventRepository,
      outboxRepository,
    } = createProcessorContext();

    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      initialBalance: Money.fromCents(1000n),
      now,
    });

    await walletRepository.save(wallet);

    const event = createDebitRequestedEvent({
      eventId: "event-1",
      playerId: "player-1",
      amountCents: "300",
      referenceId: "bet-1",
    });

    await processor.process(event);
    await processor.process(event);

    const updatedWallet = await walletRepository.findByPlayerId("player-1");
    const snapshot = updatedWallet!.toSnapshot();

    expect(snapshot.balance.toCents()).toBe(700n);
    expect(snapshot.transactions).toHaveLength(1);

    expect(processedEventRepository.processedEvents).toEqual([
      {
        eventId: "event-1",
        eventName: "wallet.debit.requested",
      },
    ]);

    expect(outboxRepository.savedEvents).toHaveLength(1);
    expect(outboxRepository.savedEvents[0]).toMatchObject({
      eventName: "wallet.debited",
      payload: {
        eventName: "wallet.debited",
        correlationId: "bet-1",
        causationId: "event-1",
        playerId: "player-1",
        walletId: "wallet-1",
        amountCents: "300",
        balanceCents: "700",
        referenceType: "BET",
        referenceId: "bet-1",
        occurredAt: now.toISOString(),
      },
    });
  });

  test("processes wallet credit requested only once for the same event id", async () => {
    const {
      processor,
      walletRepository,
      processedEventRepository,
      outboxRepository,
    } = createProcessorContext();

    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      initialBalance: Money.fromCents(1000n),
      now,
    });

    await walletRepository.save(wallet);

    const event = createCreditRequestedEvent({
      eventId: "event-2",
      playerId: "player-1",
      amountCents: "500",
      referenceId: "bet-1",
    });

    await processor.process(event);
    await processor.process(event);

    const updatedWallet = await walletRepository.findByPlayerId("player-1");
    const snapshot = updatedWallet!.toSnapshot();

    expect(snapshot.balance.toCents()).toBe(1500n);
    expect(snapshot.transactions).toHaveLength(1);

    expect(processedEventRepository.processedEvents).toEqual([
      {
        eventId: "event-2",
        eventName: "wallet.credit.requested",
      },
    ]);

    expect(outboxRepository.savedEvents).toHaveLength(1);
    expect(outboxRepository.savedEvents[0]).toMatchObject({
      eventName: "wallet.credited",
      payload: {
        eventName: "wallet.credited",
        correlationId: "bet-1",
        causationId: "event-2",
        playerId: "player-1",
        walletId: "wallet-1",
        amountCents: "500",
        balanceCents: "1500",
        referenceType: "CASHOUT",
        referenceId: "bet-1",
        occurredAt: now.toISOString(),
      },
    });
  });

  test("stores debit rejected in outbox and marks event as processed when balance is insufficient", async () => {
    const {
      processor,
      walletRepository,
      processedEventRepository,
      outboxRepository,
    } = createProcessorContext();

    const wallet = Wallet.create({
      id: "wallet-1",
      playerId: "player-1",
      initialBalance: Money.fromCents(100n),
      now,
    });

    await walletRepository.save(wallet);

    const event = createDebitRequestedEvent({
      eventId: "event-3",
      playerId: "player-1",
      amountCents: "300",
      referenceId: "bet-1",
    });

    await processor.process(event);

    const updatedWallet = await walletRepository.findByPlayerId("player-1");
    const snapshot = updatedWallet!.toSnapshot();

    expect(snapshot.balance.toCents()).toBe(100n);
    expect(snapshot.transactions).toHaveLength(0);

    expect(processedEventRepository.processedEvents).toEqual([
      {
        eventId: "event-3",
        eventName: "wallet.debit.requested",
      },
    ]);

    expect(outboxRepository.savedEvents).toHaveLength(1);
    expect(outboxRepository.savedEvents[0]).toMatchObject({
      eventName: "wallet.debit.rejected",
      payload: {
        eventName: "wallet.debit.rejected",
        correlationId: "bet-1",
        causationId: "event-3",
        playerId: "player-1",
        amountCents: "300",
        reason: "INSUFFICIENT_BALANCE",
        referenceType: "BET",
        referenceId: "bet-1",
        occurredAt: now.toISOString(),
      },
    });
  });
});
