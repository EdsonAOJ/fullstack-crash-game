import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import {
  connect,
  type Channel,
  type ChannelModel,
  type ConsumeMessage,
} from "amqplib";
import { WALLET_EVENT_NAMES } from "@crash/events";
import {
  GAME_WALLET_EVENTS_QUEUE,
  RABBITMQ_EXCHANGE,
} from "./rabbitmq.constants";

@Injectable()
export class RabbitMQConnectionService
  implements OnModuleInit, OnModuleDestroy
{
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private connectingPromise: Promise<void> | null = null;

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  async connect(): Promise<void> {
    if (this.channel) {
      return;
    }

    if (this.connectingPromise) {
      await this.connectingPromise;
      return;
    }

    this.connectingPromise = this.initializeConnection();

    try {
      await this.connectingPromise;
    } finally {
      this.connectingPromise = null;
    }
  }

  private async initializeConnection(): Promise<void> {
    const rabbitMqUrl =
      process.env.RABBITMQ_URL ?? "amqp://admin:admin@rabbitmq:5672";

    this.connection = await connect(rabbitMqUrl);
    this.channel = await this.connection.createChannel();

    await this.channel.assertExchange(RABBITMQ_EXCHANGE, "topic", {
      durable: true,
    });

    await this.channel.assertQueue(GAME_WALLET_EVENTS_QUEUE, {
      durable: true,
    });

    await this.channel.bindQueue(
      GAME_WALLET_EVENTS_QUEUE,
      RABBITMQ_EXCHANGE,
      WALLET_EVENT_NAMES.WALLET_DEBITED,
    );

    await this.channel.bindQueue(
      GAME_WALLET_EVENTS_QUEUE,
      RABBITMQ_EXCHANGE,
      WALLET_EVENT_NAMES.WALLET_DEBIT_REJECTED,
    );

    await this.channel.bindQueue(
      GAME_WALLET_EVENTS_QUEUE,
      RABBITMQ_EXCHANGE,
      WALLET_EVENT_NAMES.WALLET_CREDITED,
    );

    await this.channel.bindQueue(
      GAME_WALLET_EVENTS_QUEUE,
      RABBITMQ_EXCHANGE,
      WALLET_EVENT_NAMES.WALLET_CREDIT_REJECTED,
    );

    await this.channel.prefetch(10);

    console.log("Games RabbitMQ connection initialized.");
  }

  async healthCheck(): Promise<"ok" | "down"> {
    try {
      await this.connect();

      return this.channel ? "ok" : "down";
    } catch {
      return "down";
    }
  }

  async publish<TEvent>(routingKey: string, event: TEvent): Promise<boolean> {
    await this.healthCheck();

    return this.getChannel().publish(
      RABBITMQ_EXCHANGE,
      routingKey,
      Buffer.from(JSON.stringify(event)),
      {
        contentType: "application/json",
        persistent: true,
      },
    );
  }

  async consume(
    queue: string,
    handler: (message: ConsumeMessage) => Promise<void>,
  ): Promise<void> {
    await this.healthCheck();

    const channel = this.getChannel();

    await channel.consume(queue, async (message) => {
      if (!message) {
        return;
      }

      try {
        await handler(message);
        channel.ack(message);
      } catch (error) {
        console.error("Failed to process RabbitMQ message in Games.", error);

        channel.nack(message, false, false);
      }
    });
  }

  private getChannel(): Channel {
    if (!this.channel) {
      throw new Error("RabbitMQ channel is not initialized.");
    }

    return this.channel;
  }
}
