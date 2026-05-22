import { ProcessedEventRepository } from "@/application/ports/rocessed-event.repository";
import type { PrismaClientLike } from "./prisma-client";

export class PrismaProcessedEventRepository implements ProcessedEventRepository {
  constructor(private readonly prisma: PrismaClientLike) {}

  async exists(eventId: string): Promise<boolean> {
    const count = await this.prisma.processedEvent.count({
      where: {
        eventId,
      },
    });

    return count > 0;
  }

  async save(params: { eventId: string; eventName: string }): Promise<void> {
    await this.prisma.processedEvent.create({
      data: {
        eventId: params.eventId,
        eventName: params.eventName,
      },
    });
  }
}
