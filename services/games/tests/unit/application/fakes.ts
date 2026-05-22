import { Clock } from "../../../src/application/ports/clock";
import { IdGenerator } from "../../../src/application/ports/id-generator";

import type {
  BetRealtimePayload,
  GameRealtimeNotifier,
  RoundRealtimePayload,
} from "../../../src/application/ports/game-realtime.notifier";

export class FixedClock implements Clock {
  constructor(private readonly fixedDate: Date) {}

  now(): Date {
    return this.fixedDate;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private current = 0;

  generate(): string {
    this.current += 1;
    return `id-${this.current}`;
  }
}

export class InMemoryGameRealtimeNotifier implements GameRealtimeNotifier {
  public roundCreatedEvents: RoundRealtimePayload[] = [];
  public roundStartedEvents: RoundRealtimePayload[] = [];
  public roundMultiplierUpdatedEvents: RoundRealtimePayload[] = [];
  public roundCrashedEvents: RoundRealtimePayload[] = [];
  public roundCompletedEvents: RoundRealtimePayload[] = [];

  public betPlacedEvents: BetRealtimePayload[] = [];
  public betAcceptedEvents: BetRealtimePayload[] = [];
  public betRejectedEvents: BetRealtimePayload[] = [];
  public betCashedOutEvents: BetRealtimePayload[] = [];

  notifyRoundCreated(payload: RoundRealtimePayload): void {
    this.roundCreatedEvents.push(payload);
  }

  notifyRoundStarted(payload: RoundRealtimePayload): void {
    this.roundStartedEvents.push(payload);
  }

  notifyRoundMultiplierUpdated(payload: RoundRealtimePayload): void {
    this.roundMultiplierUpdatedEvents.push(payload);
  }

  notifyRoundCrashed(payload: RoundRealtimePayload): void {
    this.roundCrashedEvents.push(payload);
  }

  notifyRoundCompleted(payload: RoundRealtimePayload): void {
    this.roundCompletedEvents.push(payload);
  }

  notifyBetPlaced(payload: BetRealtimePayload): void {
    this.betPlacedEvents.push(payload);
  }

  notifyBetAccepted(payload: BetRealtimePayload): void {
    this.betAcceptedEvents.push(payload);
  }

  notifyBetRejected(payload: BetRealtimePayload): void {
    this.betRejectedEvents.push(payload);
  }

  notifyBetCashedOut(payload: BetRealtimePayload): void {
    this.betCashedOutEvents.push(payload);
  }
}
