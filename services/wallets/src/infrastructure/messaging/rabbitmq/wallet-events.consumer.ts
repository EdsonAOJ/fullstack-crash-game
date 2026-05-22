import { Injectable, OnModuleInit } from "@nestjs/common";
import type {
  WalletCreditRequestedEvent,
  WalletDebitRequestedEvent,
} from "@crash/events";
import { type ConsumeMessage } from "amqplib";
import {
  WalletCommandProcessor,
  type WalletCommandEvent,
} from "../../../application/services/wallet-command-processor.service";
import { WALLET_COMMANDS_QUEUE } from "./rabbitmq.constants";
import { RabbitMQConnectionService } from "./rabbitmq-connection.service";

@Injectable()
export class WalletEventsConsumer implements OnModuleInit {
  constructor(
    private readonly rabbitMq: RabbitMQConnectionService,
    private readonly walletCommandProcessor: WalletCommandProcessor,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.rabbitMq.consume(WALLET_COMMANDS_QUEUE, async (message) => {
      await this.handleMessage(message);
    });

    console.log("Wallet RabbitMQ consumer initialized.");
  }

  private async handleMessage(message: ConsumeMessage): Promise<void> {
    const event = this.parseMessage(message);

    await this.walletCommandProcessor.process(event);
  }

  private parseMessage(message: ConsumeMessage): WalletCommandEvent {
    const rawContent = message.content.toString("utf8");

    return JSON.parse(rawContent) as
      | WalletDebitRequestedEvent
      | WalletCreditRequestedEvent;
  }
}
