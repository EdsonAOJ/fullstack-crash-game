import type { BetProps } from "../../domain/entities/bet.entity";
import type { RoundSnapshot } from "../../domain/entities/round.entity";
import type {
  BetRealtimePayload,
  RoundRealtimePayload,
} from "../../application/ports/game-realtime.notifier";

export class RealtimePayloadMapper {
  static round(snapshot: RoundSnapshot): RoundRealtimePayload {
    return {
      id: snapshot.id,
      status: snapshot.status,
      crashPoint: snapshot.crashPoint.toNumber(),
      currentMultiplier: snapshot.currentMultiplier.toNumber(),
      startsAt: snapshot.startsAt.toISOString(),
      startedAt: snapshot.startedAt?.toISOString(),
      crashedAt: snapshot.crashedAt?.toISOString(),
      completedAt: snapshot.completedAt?.toISOString(),
    };
  }

  static bet(snapshot: BetProps): BetRealtimePayload {
    return {
      id: snapshot.id,
      roundId: snapshot.roundId,
      playerId: snapshot.playerId,
      amountCents: snapshot.amount.toCents().toString(),
      status: snapshot.status,
      cashoutMultiplier: snapshot.cashoutMultiplier?.toNumber(),
      payoutCents: snapshot.payoutCents?.toString(),
      rejectionReason: snapshot.rejectionReason,
    };
  }
}
