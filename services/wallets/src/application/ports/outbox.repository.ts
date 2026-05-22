type JsonPrimitive = string | number | boolean | null;

type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue;
}

export interface SaveOutboxEventInput {
  eventId: string;
  eventName: string;
  payload: JsonObject;
}

export interface OutboxEventToPublish {
  id: string;
  eventId: string;
  eventName: string;
  payload: JsonObject;
  attempts: number;
}

export interface OutboxRepository {
  save(input: SaveOutboxEventInput): Promise<void>;

  findPendingForPublish(params: {
    limit: number;
  }): Promise<OutboxEventToPublish[]>;

  markAsPublished(params: { id: string }): Promise<void>;

  markAsFailed(params: { id: string; errorMessage: string }): Promise<void>;
}
