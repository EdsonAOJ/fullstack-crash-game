import type { OutboxRepository } from "../ports/outbox.repository";
import type { WalletEventsPublisher } from "../ports/wallet-events.publisher";

const WALLET_DEBIT_REQUESTED_EVENT = "wallet.debit.requested";
const WALLET_CREDIT_REQUESTED_EVENT = "wallet.credit.requested";

interface WalletDebitRequestedPayload {
  eventId: string;
  correlationId: string;
  playerId: string;
  amountCents: string;
  referenceId: string;
}

interface WalletCreditRequestedPayload {
  eventId: string;
  correlationId: string;
  playerId: string;
  amountCents: string;
  referenceId: string;
}

export class OutboxPublisherService {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly walletEventsPublisher: WalletEventsPublisher,
  ) {}

  async publishPendingEvents(): Promise<void> {
    const events = await this.outboxRepository.findPendingForPublish({
      limit: 20,
    });

    for (const event of events) {
      try {
        await this.publishEvent(event.eventName, event.payload);

        await this.outboxRepository.markAsPublished({
          id: event.id,
        });
      } catch (error) {
        await this.outboxRepository.markAsFailed({
          id: event.id,
          errorMessage:
            error instanceof Error ? error.message : "Unknown outbox error",
        });
      }
    }
  }

  private async publishEvent(
    eventName: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    if (eventName === WALLET_DEBIT_REQUESTED_EVENT) {
      const debitPayload = this.parseWalletDebitRequestedPayload(payload);

      await this.walletEventsPublisher.publishDebitRequested(debitPayload);

      return;
    }

    if (eventName === WALLET_CREDIT_REQUESTED_EVENT) {
      const creditPayload = this.parseWalletCreditRequestedPayload(payload);

      await this.walletEventsPublisher.publishCreditRequested(creditPayload);

      return;
    }

    throw new Error(`Unsupported outbox event: ${eventName}`);
  }

  private parseWalletDebitRequestedPayload(
    payload: Record<string, unknown>,
  ): WalletDebitRequestedPayload {
    return {
      eventId: this.getString(payload, "eventId"),
      correlationId: this.getString(payload, "correlationId"),
      playerId: this.getString(payload, "playerId"),
      amountCents: this.getString(payload, "amountCents"),
      referenceId: this.getString(payload, "referenceId"),
    };
  }

  private parseWalletCreditRequestedPayload(
    payload: Record<string, unknown>,
  ): WalletCreditRequestedPayload {
    return {
      eventId: this.getString(payload, "eventId"),
      correlationId: this.getString(payload, "correlationId"),
      playerId: this.getString(payload, "playerId"),
      amountCents: this.getString(payload, "amountCents"),
      referenceId: this.getString(payload, "referenceId"),
    };
  }

  private getString(payload: Record<string, unknown>, key: string): string {
    const value = payload[key];

    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Invalid outbox payload. Missing string field: ${key}`);
    }

    return value;
  }
}
