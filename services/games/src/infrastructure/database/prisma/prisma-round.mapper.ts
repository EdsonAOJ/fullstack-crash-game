import { BetProps, BetStatus } from "../../../domain/entities/bet.entity";
import {
  Round,
  RoundSnapshot,
  RoundStatus,
} from "../../../domain/entities/round.entity";
import { BetAmount } from "../../../domain/value-objects/bet-amount.vo";
import { Multiplier } from "../../../domain/value-objects/multiplier.vo";

interface PrismaBetModel {
  id: string;
  roundId: string;
  playerId: string;
  amountCents: bigint;
  status: BetStatus;
  autoCashoutMultiplier: number | null;
  cashoutMultiplier: number | null;
  payoutCents: bigint | null;
  rejectionReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaRoundModel {
  id: string;
  status: RoundStatus;
  crashPointMultiplier: number;
  currentMultiplier: number;
  startsAt: Date;
  startedAt: Date | null;
  crashedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  bets: PrismaBetModel[];
  serverSeed: string;
  serverSeedHash: string;
  publicSeed: string;
  nonce: number;
}

export class PrismaRoundMapper {
  static toDomain(model: PrismaRoundModel): Round {
    const bets: BetProps[] = model.bets.map((bet) =>
      PrismaRoundMapper.betToDomainProps(bet),
    );

    const snapshot: RoundSnapshot = {
      id: model.id,
      status: model.status,
      crashPoint: Multiplier.fromScaledInteger(model.crashPointMultiplier),
      currentMultiplier: Multiplier.fromScaledInteger(model.currentMultiplier),
      bets,
      startsAt: model.startsAt,
      startedAt: model.startedAt ?? undefined,
      crashedAt: model.crashedAt ?? undefined,
      completedAt: model.completedAt ?? undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      serverSeed: model.serverSeed,
      serverSeedHash: model.serverSeedHash,
      publicSeed: model.publicSeed,
      nonce: model.nonce,
    };

    return Round.restore(snapshot);
  }

  static betToDomainProps(bet: PrismaBetModel): BetProps {
    return {
      id: bet.id,
      roundId: bet.roundId,
      playerId: bet.playerId,
      amount: BetAmount.fromCents(bet.amountCents),
      status: bet.status,
      autoCashoutMultiplier:
        bet.autoCashoutMultiplier !== null
          ? Multiplier.fromScaledInteger(bet.autoCashoutMultiplier)
          : undefined,
      cashoutMultiplier:
        bet.cashoutMultiplier !== null
          ? Multiplier.fromScaledInteger(bet.cashoutMultiplier)
          : undefined,
      payoutCents: bet.payoutCents ?? undefined,
      rejectionReason: bet.rejectionReason ?? undefined,
      createdAt: bet.createdAt,
      updatedAt: bet.updatedAt,
    };
  }
}
