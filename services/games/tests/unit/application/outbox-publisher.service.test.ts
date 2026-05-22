import { describe, expect, test } from "bun:test";
import { OutboxPublisherService } from "../../../src/application/services/outbox-publisher.service";
import type {
  OutboxEventToPublish,
  OutboxRepository,
  SaveOutboxEventInput,
} from "../../../src/application/ports/outbox.repository";
import type {
  PublishWalletCreditRequestedInput,
  PublishWalletDebitRequestedInput,
  WalletEventsPublisher,
} from "../../../src/application/ports/wallet-events.publisher";

class InMemoryOutboxRepository implements OutboxRepository {
  readonly events: OutboxEventToPublish[] = [];
  readonly publishedIds: string[] = [];
  readonly failedEvents: Array<{
    id: string;
    errorMessage: string;
  }> = [];

  async save(input: SaveOutboxEventInput): Promise<void> {
    this.events.push({
      id: `outbox-${this.events.length + 1}`,
      eventId: input.eventId,
      eventName: input.eventName,
      payload: input.payload,
      attempts: 0,
    });
  }

  async findPendingForPublish(params: {
    limit: number;
  }): Promise<OutboxEventToPublish[]> {
    return this.events.slice(0, params.limit);
  }

  async markAsPublished(params: { id: string }): Promise<void> {
    this.publishedIds.push(params.id);
  }

  async markAsFailed(params: {
    id: string;
    errorMessage: string;
  }): Promise<void> {
    this.failedEvents.push(params);
  }
}

class InMemoryWalletEventsPublisher implements WalletEventsPublisher {
  readonly debitRequestedEvents: PublishWalletDebitRequestedInput[] = [];
  readonly creditRequestedEvents: PublishWalletCreditRequestedInput[] = [];

  shouldFail = false;

  async publishDebitRequested(
    input: PublishWalletDebitRequestedInput,
  ): Promise<void> {
    if (this.shouldFail) {
      throw new Error("RabbitMQ is down.");
    }

    this.debitRequestedEvents.push(input);
  }

  async publishCreditRequested(
    input: PublishWalletCreditRequestedInput,
  ): Promise<void> {
    if (this.shouldFail) {
      throw new Error("RabbitMQ is down.");
    }

    this.creditRequestedEvents.push(input);
  }
}

describe("OutboxPublisherService", () => {
  test("publishes wallet debit requested event and marks it as published", async () => {
    const outboxRepository = new InMemoryOutboxRepository();
    const walletEventsPublisher = new InMemoryWalletEventsPublisher();

    await outboxRepository.save({
      eventId: "event-1",
      eventName: "wallet.debit.requested",
      payload: {
        eventId: "event-1",
        eventName: "wallet.debit.requested",
        correlationId: "bet-1",
        playerId: "player",
        amountCents: "1000",
        referenceId: "bet-1",
        occurredAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const service = new OutboxPublisherService(
      outboxRepository,
      walletEventsPublisher,
    );

    await service.publishPendingEvents();

    expect(walletEventsPublisher.debitRequestedEvents).toHaveLength(1);
    expect(walletEventsPublisher.debitRequestedEvents[0]).toEqual({
      eventId: "event-1",
      correlationId: "bet-1",
      playerId: "player",
      amountCents: "1000",
      referenceId: "bet-1",
    });

    expect(outboxRepository.publishedIds).toEqual(["outbox-1"]);
    expect(outboxRepository.failedEvents).toHaveLength(0);
  });

  test("publishes wallet credit requested event and marks it as published", async () => {
    const outboxRepository = new InMemoryOutboxRepository();
    const walletEventsPublisher = new InMemoryWalletEventsPublisher();

    await outboxRepository.save({
      eventId: "event-2",
      eventName: "wallet.credit.requested",
      payload: {
        eventId: "event-2",
        eventName: "wallet.credit.requested",
        correlationId: "bet-1",
        playerId: "player",
        amountCents: "1500",
        referenceId: "bet-1",
        occurredAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const service = new OutboxPublisherService(
      outboxRepository,
      walletEventsPublisher,
    );

    await service.publishPendingEvents();

    expect(walletEventsPublisher.creditRequestedEvents).toHaveLength(1);
    expect(walletEventsPublisher.creditRequestedEvents[0]).toEqual({
      eventId: "event-2",
      correlationId: "bet-1",
      playerId: "player",
      amountCents: "1500",
      referenceId: "bet-1",
    });

    expect(outboxRepository.publishedIds).toEqual(["outbox-1"]);
    expect(outboxRepository.failedEvents).toHaveLength(0);
  });

  test("marks event as failed when publisher throws", async () => {
    const outboxRepository = new InMemoryOutboxRepository();
    const walletEventsPublisher = new InMemoryWalletEventsPublisher();

    walletEventsPublisher.shouldFail = true;

    await outboxRepository.save({
      eventId: "event-1",
      eventName: "wallet.debit.requested",
      payload: {
        eventId: "event-1",
        eventName: "wallet.debit.requested",
        correlationId: "bet-1",
        playerId: "player",
        amountCents: "1000",
        referenceId: "bet-1",
        occurredAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const service = new OutboxPublisherService(
      outboxRepository,
      walletEventsPublisher,
    );

    await service.publishPendingEvents();

    expect(walletEventsPublisher.debitRequestedEvents).toHaveLength(0);
    expect(outboxRepository.publishedIds).toHaveLength(0);
    expect(outboxRepository.failedEvents).toEqual([
      {
        id: "outbox-1",
        errorMessage: "RabbitMQ is down.",
      },
    ]);
  });

  test("marks unsupported event as failed", async () => {
    const outboxRepository = new InMemoryOutboxRepository();
    const walletEventsPublisher = new InMemoryWalletEventsPublisher();

    await outboxRepository.save({
      eventId: "event-unsupported",
      eventName: "unknown.event",
      payload: {
        eventId: "event-unsupported",
      },
    });

    const service = new OutboxPublisherService(
      outboxRepository,
      walletEventsPublisher,
    );

    await service.publishPendingEvents();

    expect(walletEventsPublisher.debitRequestedEvents).toHaveLength(0);
    expect(walletEventsPublisher.creditRequestedEvents).toHaveLength(0);
    expect(outboxRepository.publishedIds).toHaveLength(0);
    expect(outboxRepository.failedEvents).toEqual([
      {
        id: "outbox-1",
        errorMessage: "Unsupported outbox event: unknown.event",
      },
    ]);
  });
});
