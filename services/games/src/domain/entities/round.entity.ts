import { DuplicatedBetError } from "../errors/duplicated-bet.error";
import { RoundNotAcceptingBetsError } from "../errors/round-not-accepting-bets.error";
import { RoundNotRunningError } from "../errors/round-not-running.error";
import { Bet, BetProps } from "./bet.entity";
import { Multiplier } from "../value-objects/multiplier.vo";
import { BetNotFoundInRoundError } from "../errors/bet-not-found-in-round.error";

export type RoundStatus =
  | "WAITING_FOR_BETS"
  | "RUNNING"
  | "CRASHED"
  | "COMPLETED";

export interface RoundProps {
  id: string;
  status: RoundStatus;
  crashPoint: Multiplier;
  currentMultiplier: Multiplier;
  bets: Bet[];
  startsAt: Date;
  startedAt?: Date;
  crashedAt?: Date;
  completedAt?: Date;
  serverSeed: string;
  serverSeedHash: string;
  publicSeed: string;
  nonce: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoundSnapshot {
  id: string;
  status: RoundStatus;
  crashPoint: Multiplier;
  currentMultiplier: Multiplier;
  bets: BetProps[];
  startsAt: Date;
  startedAt?: Date;
  crashedAt?: Date;
  completedAt?: Date;
  serverSeed: string;
  serverSeedHash: string;
  publicSeed: string;
  nonce: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Round {
  private readonly id: string;
  private status: RoundStatus;
  private readonly crashPoint: Multiplier;
  private currentMultiplier: Multiplier;
  private readonly bets: Bet[];
  private readonly startsAt: Date;
  private startedAt?: Date;
  private crashedAt?: Date;
  private completedAt?: Date;
  private readonly createdAt: Date;
  private updatedAt: Date;
  private readonly serverSeed: string;
  private readonly serverSeedHash: string;
  private readonly publicSeed: string;
  private readonly nonce: number;

  private constructor(props: RoundProps) {
    this.id = props.id;
    this.status = props.status;
    this.crashPoint = props.crashPoint;
    this.currentMultiplier = props.currentMultiplier;
    this.bets = props.bets;
    this.startsAt = props.startsAt;
    this.startedAt = props.startedAt;
    this.crashedAt = props.crashedAt;
    this.completedAt = props.completedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.serverSeed = props.serverSeed;
    this.serverSeedHash = props.serverSeedHash;
    this.publicSeed = props.publicSeed;
    this.nonce = props.nonce;
  }

  static create(props: {
    id: string;
    crashPoint: Multiplier;
    serverSeed: string;
    serverSeedHash: string;
    publicSeed: string;
    nonce: number;
    startsAt: Date;
    now: Date;
  }): Round {
    return new Round({
      id: props.id,
      status: "WAITING_FOR_BETS",
      crashPoint: props.crashPoint,
      currentMultiplier: Multiplier.initial(),
      bets: [],
      startsAt: props.startsAt,
      createdAt: props.now,
      updatedAt: props.now,
      serverSeed: props.serverSeed,
      serverSeedHash: props.serverSeedHash,
      publicSeed: props.publicSeed,
      nonce: props.nonce,
    });
  }

  static restore(snapshot: RoundSnapshot): Round {
    return new Round({
      ...snapshot,
      bets: snapshot.bets.map((bet) => Bet.restore(bet)),
    });
  }

  placeBet(bet: Bet): void {
    if (this.status !== "WAITING_FOR_BETS") {
      throw new RoundNotAcceptingBetsError();
    }

    const playerAlreadyHasActiveBet = this.bets.some(
      (currentBet) =>
        currentBet.belongsToPlayer(bet.toSnapshot().playerId) &&
        currentBet.isPendingOrAccepted(),
    );

    if (playerAlreadyHasActiveBet) {
      throw new DuplicatedBetError();
    }

    this.bets.push(bet);
    this.updatedAt = bet.toSnapshot().createdAt;
  }

  start(now: Date): void {
    if (this.status !== "WAITING_FOR_BETS") {
      return;
    }

    this.status = "RUNNING";
    this.startedAt = now;
    this.updatedAt = now;
  }

  updateMultiplier(multiplier: Multiplier, now: Date): Bet[] {
    if (this.status !== "RUNNING") {
      throw new RoundNotRunningError();
    }

    this.currentMultiplier = multiplier;
    this.updatedAt = now;

    const autoCashedOutBets = this.cashoutEligibleAutoBets(now);

    if (this.currentMultiplier.isGreaterThanOrEqual(this.crashPoint)) {
      this.crash(now);
    }

    return autoCashedOutBets;
  }

  cashout(playerId: string, now: Date): Bet {
    if (this.status !== "RUNNING") {
      throw new RoundNotRunningError();
    }

    const bet = this.bets.find((currentBet) =>
      currentBet.belongsToPlayer(playerId),
    );

    if (!bet) {
      throw new RoundNotRunningError();
    }

    bet.requestCashout(this.currentMultiplier, now);
    this.updatedAt = now;

    return bet;
  }

  crash(now: Date): void {
    if (this.status !== "RUNNING") {
      return;
    }

    this.status = "CRASHED";
    this.crashedAt = now;
    this.currentMultiplier = this.crashPoint;

    for (const bet of this.bets) {
      bet.markAsLost(now);
    }

    this.updatedAt = now;
  }

  complete(now: Date): void {
    if (this.status !== "CRASHED") {
      return;
    }

    this.status = "COMPLETED";
    this.completedAt = now;
    this.updatedAt = now;
  }

  confirmBetDebit(betId: string, now: Date): Bet {
    const bet = this.findBetOrThrow(betId);

    bet.acceptDebit(now);
    this.updatedAt = now;

    return bet;
  }

  rejectBetDebit(betId: string, reason: string, now: Date): Bet {
    const bet = this.findBetOrThrow(betId);

    bet.rejectDebit(reason, now);
    this.updatedAt = now;

    return bet;
  }

  private findBetOrThrow(betId: string): Bet {
    const bet = this.bets.find(
      (currentBet) => currentBet.toSnapshot().id === betId,
    );

    if (!bet) {
      throw new BetNotFoundInRoundError();
    }

    return bet;
  }

  confirmBetCashoutCredit(betId: string, now: Date): Bet {
    const bet = this.findBetOrThrow(betId);

    bet.confirmCashoutCredit(now);
    this.updatedAt = now;

    return bet;
  }

  cashoutEligibleAutoBets(now: Date): Bet[] {
    if (this.status !== "RUNNING") {
      return [];
    }

    const cashedOutBets: Bet[] = [];

    for (const bet of this.bets) {
      if (bet.shouldAutoCashout(this.currentMultiplier)) {
        bet.requestCashout(this.currentMultiplier, now);
        cashedOutBets.push(bet);
      }
    }

    if (cashedOutBets.length > 0) {
      this.updatedAt = now;
    }

    return cashedOutBets;
  }

  toSnapshot(): RoundSnapshot {
    return {
      id: this.id,
      status: this.status,
      crashPoint: this.crashPoint,
      currentMultiplier: this.currentMultiplier,
      bets: this.bets.map((bet) => bet.toSnapshot()),
      startsAt: this.startsAt,
      startedAt: this.startedAt,
      crashedAt: this.crashedAt,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      serverSeed: this.serverSeed,
      serverSeedHash: this.serverSeedHash,
      publicSeed: this.publicSeed,
      nonce: this.nonce,
    };
  }
}
