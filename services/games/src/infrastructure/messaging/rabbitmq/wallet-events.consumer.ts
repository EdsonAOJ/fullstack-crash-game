import { Injectable, OnModuleInit } from "@nestjs/common";
import type {
  WalletCreditedEvent,
  WalletCreditRejectedEvent,
  WalletDebitedEvent,
  WalletDebitRejectedEvent,
} from "@crash/events";
import { type ConsumeMessage } from "amqplib";
import {
  WalletResultProcessor,
  type WalletResultEvent,
} from "../../../application/services/wallet-result-processor.service";
import { GAME_WALLET_EVENTS_QUEUE } from "./rabbitmq.constants";
import { RabbitMQConnectionService } from "./rabbitmq-connection.service";

@Injectable()
export class WalletEventsConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMq: RabbitMQConnectionService,
    private readonly walletResultProcessor: WalletResultProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMq.consume(GAME_WALLET_EVENTS_QUEUE, async (message) => {
      await this.handleMessage(message);
    });

    console.log("Games wallet events consumer initialized.");
  }

  private async handleMessage(message: ConsumeMessage): Promise<void> {
    const event = this.parseMessage(message);

    await this.walletResultProcessor.process(event);
  }

  private parseMessage(message: ConsumeMessage): WalletResultEvent {
    return JSON.parse(message.content.toString("utf8")) as
      | WalletDebitedEvent
      | WalletDebitRejectedEvent
      | WalletCreditedEvent
      | WalletCreditRejectedEvent;
  }
}
