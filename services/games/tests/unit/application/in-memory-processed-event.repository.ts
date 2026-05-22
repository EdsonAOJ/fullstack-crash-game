import { ProcessedEventRepository } from "@/application/ports/rocessed-event.repository";

export class InMemoryProcessedEventRepository implements ProcessedEventRepository {
  readonly processedEvents: Array<{
    eventId: string;
    eventName: string;
  }> = [];

  async exists(eventId: string): Promise<boolean> {
    return this.processedEvents.some((event) => event.eventId === eventId);
  }

  async save(params: { eventId: string; eventName: string }): Promise<void> {
    if (await this.exists(params.eventId)) {
      return;
    }

    this.processedEvents.push(params);
  }
}
