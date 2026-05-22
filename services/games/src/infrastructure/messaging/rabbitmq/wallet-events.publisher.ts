import { Injectable } from "@nestjs/common";
import {
  type WalletCreditRequestedEvent,
  type WalletDebitRequestedEvent,
  WALLET_EVENT_NAMES,
} from "@crash/events";
import {
  PublishWalletCreditRequestedInput,
  PublishWalletDebitRequestedInput,
  WalletEventsPublisher,
} from "../../../application/ports/wallet-events.publisher";
import { RabbitMQConnectionService } from "./rabbitmq-connection.service";

@Injectable()
export class RabbitMQWalletEventsPublisher implements WalletEventsPublisher {
  constructor(private readonly rabbitMq: RabbitMQConnectionService) {}

  async publishDebitRequested(
    input: PublishWalletDebitRequestedInput,
  ): Promise<void> {
    const event: WalletDebitRequestedEvent = {
      metadata: {
        eventId: input.eventId,
        eventName: WALLET_EVENT_NAMES.WALLET_DEBIT_REQUESTED,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        version: 1,
        source: "games-service",
      },
      payload: {
        playerId: input.playerId,
        amountCents: input.amountCents,
        referenceType: "BET",
        referenceId: input.referenceId,
      },
    };

    await this.rabbitMq.publish(
      WALLET_EVENT_NAMES.WALLET_DEBIT_REQUESTED,
      event,
    );
  }

  async publishCreditRequested(
    input: PublishWalletCreditRequestedInput,
  ): Promise<void> {
    const event: WalletCreditRequestedEvent = {
      metadata: {
        eventId: input.eventId,
        eventName: WALLET_EVENT_NAMES.WALLET_CREDIT_REQUESTED,
        occurredAt: new Date().toISOString(),
        correlationId: input.correlationId,
        version: 1,
        source: "games-service",
      },
      payload: {
        playerId: input.playerId,
        amountCents: input.amountCents,
        referenceType: "CASHOUT",
        referenceId: input.referenceId,
      },
    };

    await this.rabbitMq.publish(
      WALLET_EVENT_NAMES.WALLET_CREDIT_REQUESTED,
      event,
    );
  }
}
