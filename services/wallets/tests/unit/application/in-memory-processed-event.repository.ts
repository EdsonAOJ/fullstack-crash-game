import type { ProcessedEventRepository } from "../../../src/application/ports/processed-event.repository";

export class InMemoryProcessedEventRepository implements ProcessedEventRepository {
  readonly processedEvents: Array<{
    eventId: string;
    eventName: string;
  }> = [];

  async exists(eventId: string): Promise<boolean> {
    return this.processedEvents.some((event) => event.eventId === eventId);
  }

  async save(params: { eventId: string; eventName: string }): Promise<void> {
    const alreadyExists = await this.exists(params.eventId);

    if (alreadyExists) {
      return;
    }

    this.processedEvents.push(params);
  }
}
