import { Injectable } from "@nestjs/common";
import {
  type WalletCreditedEvent,
  type WalletCreditRejectedEvent,
  type WalletDebitedEvent,
  type WalletDebitRejectedEvent,
  WALLET_EVENT_NAMES,
} from "@crash/events";
import { RabbitMQConnectionService } from "./rabbitmq-connection.service";

interface PublishWalletDebitedInput {
  eventId: string;
  correlationId: string;
  causationId: string;
  playerId: string;
  walletId: string;
  amountCents: string;
  balanceCents: string;
  referenceType: "BET";
  referenceId: string;
}

interface PublishWalletDebitRejectedInput {
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
  referenceType: "BET";
  referenceId: string;
}

interface PublishWalletCreditedInput {
  eventId: string;
  correlationId: string;
  causationId: string;
  playerId: string;
  walletId: string;
  amountCents: string;
  balanceCents: string;
  referenceType: "CASHOUT" | "REFUND";
  referenceId: string;
}

interface PublishWalletCreditRejectedInput {
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
  referenceType: "CASHOUT" | "REFUND";
  referenceId: string;
}

@Injectable()
export class WalletEventsPublisher {
  constructor(private readonly rabbitMq: RabbitMQConnectionService) {}

  async publishWalletDebited(input: PublishWalletDebitedInput): Promise<void> {
    const event: WalletDebitedEvent = {
      metadata: {
        eventId: input.eventId,
        eventName: WALLET_EVENT_NAMES.WALLET_DEBITED,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        causationId: input.causationId,
        version: 1,
        source: "wallets-service",
      },
      payload: {
        playerId: input.playerId,
        walletId: input.walletId,
        amountCents: input.amountCents,
        balanceCents: input.balanceCents,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      },
    };

    await this.rabbitMq.publish(WALLET_EVENT_NAMES.WALLET_DEBITED, event);
  }

  async publishWalletDebitRejected(
    input: PublishWalletDebitRejectedInput,
  ): Promise<void> {
    const event: WalletDebitRejectedEvent = {
      metadata: {
        eventId: input.eventId,
        eventName: WALLET_EVENT_NAMES.WALLET_DEBIT_REJECTED,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        causationId: input.causationId,
        version: 1,
        source: "wallets-service",
      },
      payload: {
        playerId: input.playerId,
        amountCents: input.amountCents,
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      },
    };

    await this.rabbitMq.publish(
      WALLET_EVENT_NAMES.WALLET_DEBIT_REJECTED,
      event,
    );
  }

  async publishWalletCredited(
    input: PublishWalletCreditedInput,
  ): Promise<void> {
    const event: WalletCreditedEvent = {
      metadata: {
        eventId: input.eventId,
        eventName: WALLET_EVENT_NAMES.WALLET_CREDITED,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        causationId: input.causationId,
        version: 1,
        source: "wallets-service",
      },
      payload: {
        playerId: input.playerId,
        walletId: input.walletId,
        amountCents: input.amountCents,
        balanceCents: input.balanceCents,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      },
    };

    await this.rabbitMq.publish(WALLET_EVENT_NAMES.WALLET_CREDITED, event);
  }

  async publishWalletCreditRejected(
    input: PublishWalletCreditRejectedInput,
  ): Promise<void> {
    const event: WalletCreditRejectedEvent = {
      metadata: {
        eventId: input.eventId,
        eventName: WALLET_EVENT_NAMES.WALLET_CREDIT_REJECTED,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        causationId: input.causationId,
        version: 1,
        source: "wallets-service",
      },
      payload: {
        playerId: input.playerId,
        amountCents: input.amountCents,
        reason: input.reason,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
      },
    };

    await this.rabbitMq.publish(
      WALLET_EVENT_NAMES.WALLET_CREDIT_REJECTED,
      event,
    );
  }
}
