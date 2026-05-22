import type { OutboxRepository } from "../ports/outbox.repository";
import type { WalletResultEventsPublisher } from "../ports/wallet-result-events.publisher";

const WALLET_DEBITED_EVENT = "wallet.debited";
const WALLET_DEBIT_REJECTED_EVENT = "wallet.debit.rejected";
const WALLET_CREDITED_EVENT = "wallet.credited";
const WALLET_CREDIT_REJECTED_EVENT = "wallet.credit.rejected";

interface WalletDebitedPayload {
  eventId: string;
  correlationId: string;
  causationId: string;
  playerId: string;
  walletId: string;
  amountCents: string;
  balanceCents: string;
  referenceType?: string;
  referenceId?: string;
}

interface WalletDebitRejectedPayload {
  eventId: string;
  correlationId: string;
  causationId: string;
  playerId: string;
  amountCents: string;
  reason:
    | "INSUFFICIENT_BALANCE"
    | "WALLET_NOT_FOUND"
    | "INVALID_AMOUNT"
    | "DUPLICATED_EVENT"
    | "UNKNOWN";
  referenceType?: string;
  referenceId?: string;
}

interface WalletCreditedPayload {
  eventId: string;
  correlationId: string;
  causationId: string;
  playerId: string;
  walletId: string;
  amountCents: string;
  balanceCents: string;
  referenceType?: string;
  referenceId?: string;
}

interface WalletCreditRejectedPayload {
  eventId: string;
  correlationId: string;
  causationId: string;
  playerId: string;
  amountCents: string;
  reason:
    | "WALLET_NOT_FOUND"
    | "INVALID_AMOUNT"
    | "DUPLICATED_EVENT"
    | "UNKNOWN";
  referenceType?: string;
  referenceId?: string;
}

export class OutboxPublisherService {
  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly walletEventsPublisher: WalletResultEventsPublisher,
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
    if (eventName === WALLET_DEBITED_EVENT) {
      await this.walletEventsPublisher.publishWalletDebited(
        this.parseWalletDebitedPayload(payload),
      );

      return;
    }

    if (eventName === WALLET_DEBIT_REJECTED_EVENT) {
      await this.walletEventsPublisher.publishWalletDebitRejected(
        this.parseWalletDebitRejectedPayload(payload),
      );

      return;
    }

    if (eventName === WALLET_CREDITED_EVENT) {
      await this.walletEventsPublisher.publishWalletCredited(
        this.parseWalletCreditedPayload(payload),
      );

      return;
    }

    if (eventName === WALLET_CREDIT_REJECTED_EVENT) {
      await this.walletEventsPublisher.publishWalletCreditRejected(
        this.parseWalletCreditRejectedPayload(payload),
      );

      return;
    }

    throw new Error(`Unsupported outbox event: ${eventName}`);
  }

  private parseWalletDebitedPayload(
    payload: Record<string, unknown>,
  ): WalletDebitedPayload {
    return {
      eventId: this.getString(payload, "eventId"),
      correlationId: this.getString(payload, "correlationId"),
      causationId: this.getString(payload, "causationId"),
      playerId: this.getString(payload, "playerId"),
      walletId: this.getString(payload, "walletId"),
      amountCents: this.getString(payload, "amountCents"),
      balanceCents: this.getString(payload, "balanceCents"),
      referenceType: this.getOptionalString(payload, "referenceType"),
      referenceId: this.getOptionalString(payload, "referenceId"),
    };
  }

  private parseWalletDebitRejectedPayload(
    payload: Record<string, unknown>,
  ): WalletDebitRejectedPayload {
    return {
      eventId: this.getString(payload, "eventId"),
      correlationId: this.getString(payload, "correlationId"),
      causationId: this.getString(payload, "causationId"),
      playerId: this.getString(payload, "playerId"),
      amountCents: this.getString(payload, "amountCents"),
      reason: this.getDebitRejectedReason(payload),
      referenceType: this.getOptionalString(payload, "referenceType"),
      referenceId: this.getOptionalString(payload, "referenceId"),
    };
  }

  private parseWalletCreditedPayload(
    payload: Record<string, unknown>,
  ): WalletCreditedPayload {
    return {
      eventId: this.getString(payload, "eventId"),
      correlationId: this.getString(payload, "correlationId"),
      causationId: this.getString(payload, "causationId"),
      playerId: this.getString(payload, "playerId"),
      walletId: this.getString(payload, "walletId"),
      amountCents: this.getString(payload, "amountCents"),
      balanceCents: this.getString(payload, "balanceCents"),
      referenceType: this.getOptionalString(payload, "referenceType"),
      referenceId: this.getOptionalString(payload, "referenceId"),
    };
  }

  private parseWalletCreditRejectedPayload(
    payload: Record<string, unknown>,
  ): WalletCreditRejectedPayload {
    return {
      eventId: this.getString(payload, "eventId"),
      correlationId: this.getString(payload, "correlationId"),
      causationId: this.getString(payload, "causationId"),
      playerId: this.getString(payload, "playerId"),
      amountCents: this.getString(payload, "amountCents"),
      reason: this.getCreditRejectedReason(payload),
      referenceType: this.getOptionalString(payload, "referenceType"),
      referenceId: this.getOptionalString(payload, "referenceId"),
    };
  }

  private getString(payload: Record<string, unknown>, key: string): string {
    const value = payload[key];

    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error(`Invalid outbox payload. Missing string field: ${key}`);
    }

    return value;
  }

  private getOptionalString(
    payload: Record<string, unknown>,
    key: string,
  ): string | undefined {
    const value = payload[key];

    if (value === null || value === undefined) {
      return undefined;
    }

    if (typeof value !== "string") {
      throw new Error(`Invalid outbox payload. Field must be string: ${key}`);
    }

    return value;
  }

  private getDebitRejectedReason(
    payload: Record<string, unknown>,
  ): WalletDebitRejectedPayload["reason"] {
    const reason = this.getString(payload, "reason");

    if (
      reason === "INSUFFICIENT_BALANCE" ||
      reason === "WALLET_NOT_FOUND" ||
      reason === "INVALID_AMOUNT" ||
      reason === "DUPLICATED_EVENT" ||
      reason === "UNKNOWN"
    ) {
      return reason;
    }

    throw new Error(`Invalid wallet debit rejected reason: ${reason}`);
  }

  private getCreditRejectedReason(
    payload: Record<string, unknown>,
  ): WalletCreditRejectedPayload["reason"] {
    const reason = this.getString(payload, "reason");

    if (
      reason === "WALLET_NOT_FOUND" ||
      reason === "INVALID_AMOUNT" ||
      reason === "DUPLICATED_EVENT" ||
      reason === "UNKNOWN"
    ) {
      return reason;
    }

    throw new Error(`Invalid wallet credit rejected reason: ${reason}`);
  }
}
