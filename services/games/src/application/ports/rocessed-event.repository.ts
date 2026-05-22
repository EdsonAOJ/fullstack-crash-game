export interface ProcessedEventRepository {
  exists(eventId: string): Promise<boolean>;

  save(params: { eventId: string; eventName: string }): Promise<void>;
}
