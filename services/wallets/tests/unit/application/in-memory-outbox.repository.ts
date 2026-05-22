import type {
  OutboxEventToPublish,
  OutboxRepository,
  SaveOutboxEventInput,
} from "../../../src/application/ports/outbox.repository";

export class InMemoryOutboxRepository implements OutboxRepository {
  readonly savedEvents: SaveOutboxEventInput[] = [];

  private readonly pendingEvents: OutboxEventToPublish[] = [];

  async save(input: SaveOutboxEventInput): Promise<void> {
    this.savedEvents.push(input);

    this.pendingEvents.push({
      id: `outbox-${this.pendingEvents.length + 1}`,
      eventId: input.eventId,
      eventName: input.eventName,
      payload: input.payload,
      attempts: 0,
    });
  }

  async findPendingForPublish(params: {
    limit: number;
  }): Promise<OutboxEventToPublish[]> {
    return this.pendingEvents.slice(0, params.limit);
  }

  async markAsPublished(params: { id: string }): Promise<void> {
    const index = this.pendingEvents.findIndex(
      (event) => event.id === params.id,
    );

    if (index >= 0) {
      this.pendingEvents.splice(index, 1);
    }
  }

  async markAsFailed(params: {
    id: string;
    errorMessage: string;
  }): Promise<void> {
    const event = this.pendingEvents.find(
      (currentEvent) => currentEvent.id === params.id,
    );

    if (!event) {
      return;
    }

    event.attempts += 1;
  }
}
