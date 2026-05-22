export interface RoundRealtimePayload {
  id: string;
  status: string;
  crashPoint?: number;
  currentMultiplier: number;
  startsAt: string;
  startedAt?: string;
  crashedAt?: string;
  completedAt?: string;
  serverSeedHash?: string;
}
export interface BetRealtimePayload {
  id: string;
  roundId: string;
  playerId: string;
  amountCents: string;
  status: string;
  cashoutMultiplier?: number;
  payoutCents?: string;
  rejectionReason?: string;
}

export interface GameRealtimeNotifier {
  notifyRoundCreated(payload: RoundRealtimePayload): void;
  notifyRoundStarted(payload: RoundRealtimePayload): void;
  notifyRoundMultiplierUpdated(payload: RoundRealtimePayload): void;
  notifyRoundCrashed(payload: RoundRealtimePayload): void;
  notifyRoundCompleted(payload: RoundRealtimePayload): void;

  notifyBetPlaced(payload: BetRealtimePayload): void;
  notifyBetAccepted(payload: BetRealtimePayload): void;
  notifyBetRejected(payload: BetRealtimePayload): void;
  notifyBetCashedOut(payload: BetRealtimePayload): void;
}
