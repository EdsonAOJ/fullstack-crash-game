import { Prisma } from "@prisma/client";
import type {
  JsonObject,
  OutboxEventToPublish,
  OutboxRepository,
  SaveOutboxEventInput,
} from "../../../application/ports/outbox.repository";
import type { PrismaClientLike } from "./prisma-client";

export class PrismaOutboxRepository implements OutboxRepository {
  constructor(private readonly prisma: PrismaClientLike) {}

  async save(input: SaveOutboxEventInput): Promise<void> {
    await this.prisma.outboxEvent.create({
      data: {
        eventId: input.eventId,
        eventName: input.eventName,
        payload: input.payload as Prisma.InputJsonObject,
      },
    });
  }

  async findPendingForPublish(params: {
    limit: number;
  }): Promise<OutboxEventToPublish[]> {
    const events = await this.prisma.outboxEvent.findMany({
      where: {
        status: {
          in: ["PENDING", "FAILED"],
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: params.limit,
    });

    return events.map((event) => ({
      id: event.id,
      eventId: event.eventId,
      eventName: event.eventName,
      payload: this.toJsonObject(event.payload),
      attempts: event.attempts,
    }));
  }

  async markAsPublished(params: { id: string }): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: {
        id: params.id,
      },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        lastError: null,
      },
    });
  }

  async markAsFailed(params: {
    id: string;
    errorMessage: string;
  }): Promise<void> {
    await this.prisma.outboxEvent.update({
      where: {
        id: params.id,
      },
      data: {
        status: "FAILED",
        attempts: {
          increment: 1,
        },
        lastError: params.errorMessage,
      },
    });
  }

  private toJsonObject(value: Prisma.JsonValue): JsonObject {
    if (!this.isJsonObject(value)) {
      throw new Error("Outbox event payload must be a JSON object.");
    }

    return value as JsonObject;
  }

  private isJsonObject(value: Prisma.JsonValue): boolean {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
