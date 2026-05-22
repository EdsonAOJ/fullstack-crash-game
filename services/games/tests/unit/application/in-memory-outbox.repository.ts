import type {
  OutboxEventToPublish,
  OutboxRepository,
  SaveOutboxEventInput,
} from "../../../src/application/ports/outbox.repository";

export class InMemoryOutboxRepository implements OutboxRepository {
  readonly savedEvents: SaveOutboxEventInput[] = [];

  private readonly rows: OutboxEventToPublish[] = [];

  async save(input: SaveOutboxEventInput): Promise<void> {
    this.savedEvents.push(input);

    this.rows.push({
      id: `outbox-${this.rows.length + 1}`,
      eventId: input.eventId,
      eventName: input.eventName,
      payload: input.payload,
      attempts: 0,
    });
  }

  async findPendingForPublish(params: {
    limit: number;
  }): Promise<OutboxEventToPublish[]> {
    return this.rows.slice(0, params.limit);
  }

  async markAsPublished(params: { id: string }): Promise<void> {
    const index = this.rows.findIndex((event) => event.id === params.id);

    if (index >= 0) {
      this.rows.splice(index, 1);
    }
  }

  async markAsFailed(params: {
    id: string;
    errorMessage: string;
  }): Promise<void> {
    const event = this.rows.find(
      (currentEvent) => currentEvent.id === params.id,
    );

    if (!event) {
      return;
    }

    event.attempts += 1;
  }
}
