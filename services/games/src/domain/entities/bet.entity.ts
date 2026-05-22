import { CashoutNotAllowedError } from "../errors/cashout-not-allowed.error";
import { BetAmount } from "../value-objects/bet-amount.vo";
import { Multiplier } from "../value-objects/multiplier.vo";

export type BetStatus =
  | "PENDING_DEBIT"
  | "ACCEPTED"
  | "REJECTED"
  | "CASHED_OUT_PENDING_CREDIT"
  | "CASHED_OUT"
  | "LOST";

export interface BetProps {
  id: string;
  roundId: string;
  playerId: string;
  amount: BetAmount;
  status: BetStatus;
  cashoutMultiplier?: Multiplier;
  payoutCents?: bigint;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Bet {
  private readonly id: string;
  private readonly roundId: string;
  private readonly playerId: string;
  private readonly amount: BetAmount;
  private status: BetStatus;
  private cashoutMultiplier?: Multiplier;
  private payoutCents?: bigint;
  private rejectionReason?: string;
  private readonly createdAt: Date;
  private updatedAt: Date;

  private constructor(props: BetProps) {
    this.id = props.id;
    this.roundId = props.roundId;
    this.playerId = props.playerId;
    this.amount = props.amount;
    this.status = props.status;
    this.cashoutMultiplier = props.cashoutMultiplier;
    this.payoutCents = props.payoutCents;
    this.rejectionReason = props.rejectionReason;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static place(props: {
    id: string;
    roundId: string;
    playerId: string;
    amount: BetAmount;
    now: Date;
  }): Bet {
    return new Bet({
      id: props.id,
      roundId: props.roundId,
      playerId: props.playerId,
      amount: props.amount,
      status: "PENDING_DEBIT",
      createdAt: props.now,
      updatedAt: props.now,
    });
  }

  static restore(props: BetProps): Bet {
    return new Bet(props);
  }

  acceptDebit(now: Date): void {
    if (this.status !== "PENDING_DEBIT") {
      return;
    }

    this.status = "ACCEPTED";
    this.updatedAt = now;
  }

  rejectDebit(reason: string, now: Date): void {
    if (this.status !== "PENDING_DEBIT") {
      return;
    }

    this.status = "REJECTED";
    this.rejectionReason = reason;
    this.updatedAt = now;
  }

  requestCashout(multiplier: Multiplier, now: Date): void {
    if (this.status !== "ACCEPTED") {
      throw new CashoutNotAllowedError();
    }

    this.status = "CASHED_OUT_PENDING_CREDIT";
    this.cashoutMultiplier = multiplier;
    this.payoutCents =
      (this.amount.toCents() * BigInt(multiplier.toScaledInteger())) / 100n;
    this.updatedAt = now;
  }

  confirmCashoutCredit(now: Date): void {
    if (this.status !== "CASHED_OUT_PENDING_CREDIT") {
      return;
    }

    this.status = "CASHED_OUT";
    this.updatedAt = now;
  }

  markAsLost(now: Date): void {
    if (this.status !== "ACCEPTED") {
      return;
    }

    this.status = "LOST";
    this.updatedAt = now;
  }

  belongsToPlayer(playerId: string): boolean {
    return this.playerId === playerId;
  }

  isPendingOrAccepted(): boolean {
    return this.status === "PENDING_DEBIT" || this.status === "ACCEPTED";
  }

  toSnapshot(): BetProps {
    return {
      id: this.id,
      roundId: this.roundId,
      playerId: this.playerId,
      amount: this.amount,
      status: this.status,
      cashoutMultiplier: this.cashoutMultiplier,
      payoutCents: this.payoutCents,
      rejectionReason: this.rejectionReason,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
