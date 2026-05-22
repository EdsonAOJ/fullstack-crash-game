import { describe, expect, test } from "bun:test";
import { Bet } from "../../src/domain/entities/bet.entity";
import { Round } from "../../src/domain/entities/round.entity";
import { DuplicatedBetError } from "../../src/domain/errors/duplicated-bet.error";
import { RoundNotAcceptingBetsError } from "../../src/domain/errors/round-not-accepting-bets.error";
import { RoundNotRunningError } from "../../src/domain/errors/round-not-running.error";
import { BetAmount } from "../../src/domain/value-objects/bet-amount.vo";
import { Multiplier } from "../../src/domain/value-objects/multiplier.vo";

const now = new Date("2026-01-01T00:00:00.000Z");

import { createTestRound } from "./factories/round.factory";

function createRound(): Round {
  return createTestRound();
}

function createBet(playerId = "player-1"): Bet {
  return Bet.place({
    id: `bet-${playerId}`,
    roundId: "round-1",
    playerId,
    amount: BetAmount.fromCents(1000n),
    now,
  });
}

describe("Round entity", () => {
  test("creates a round waiting for bets", () => {
    const round = createRound();

    const snapshot = round.toSnapshot();

    expect(snapshot.id).toBe("round-1");
    expect(snapshot.status).toBe("WAITING_FOR_BETS");
    expect(snapshot.currentMultiplier.toNumber()).toBe(1);
    expect(snapshot.crashPoint.toNumber()).toBe(2);
    expect(snapshot.bets).toHaveLength(0);
  });

  test("places a bet while waiting for bets", () => {
    const round = createRound();
    const bet = createBet();

    round.placeBet(bet);

    const snapshot = round.toSnapshot();

    expect(snapshot.bets).toHaveLength(1);
    expect(snapshot.bets[0].status).toBe("PENDING_DEBIT");
    expect(snapshot.bets[0].amount.toCents()).toBe(1000n);
  });

  test("does not allow duplicated bet for same player", () => {
    const round = createRound();

    round.placeBet(createBet("player-1"));

    expect(() => round.placeBet(createBet("player-1"))).toThrow(
      DuplicatedBetError,
    );
  });

  test("does not allow bet after round starts", () => {
    const round = createRound();

    round.start(now);

    expect(() => round.placeBet(createBet("player-1"))).toThrow(
      RoundNotAcceptingBetsError,
    );
  });

  test("updates multiplier while running", () => {
    const round = createRound();

    round.start(now);
    round.updateMultiplier(Multiplier.fromNumber(1.5), now);

    expect(round.toSnapshot().currentMultiplier.toNumber()).toBe(1.5);
    expect(round.toSnapshot().status).toBe("RUNNING");
  });

  test("crashes when multiplier reaches crash point", () => {
    const round = createRound();
    const bet = createBet("player-1");

    round.placeBet(bet);
    bet.acceptDebit(now);

    round.start(now);
    round.updateMultiplier(Multiplier.fromNumber(2), now);

    const snapshot = round.toSnapshot();

    expect(snapshot.status).toBe("CRASHED");
    expect(snapshot.currentMultiplier.toNumber()).toBe(2);
    expect(snapshot.bets[0].status).toBe("LOST");
  });

  test("allows cashout while round is running", () => {
    const round = createRound();
    const bet = createBet("player-1");

    round.placeBet(bet);
    bet.acceptDebit(now);

    round.start(now);
    round.updateMultiplier(Multiplier.fromNumber(1.5), now);

    const cashedOutBet = round.cashout("player-1", now);
    const snapshot = cashedOutBet.toSnapshot();

    expect(snapshot.status).toBe("CASHED_OUT_PENDING_CREDIT");
    expect(snapshot.cashoutMultiplier?.toNumber()).toBe(1.5);
    expect(snapshot.payoutCents).toBe(1500n);
  });

  test("does not allow cashout when round is not running", () => {
    const round = createRound();

    expect(() => round.cashout("player-1", now)).toThrow(RoundNotRunningError);
  });

  test("automatically cashes out accepted bets when multiplier reaches auto cashout target", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");

    const round = createTestRound({
      id: "round-1",
      crashPoint: Multiplier.fromNumber(3),
      startsAt: new Date("2026-01-01T00:00:10.000Z"),
      now,
    });

    const bet = Bet.place({
      id: "bet-1",
      roundId: "round-1",
      playerId: "player-1",
      amount: BetAmount.fromCents(1000n),
      autoCashoutMultiplier: Multiplier.fromNumber(2),
      now,
    });

    round.placeBet(bet);
    bet.acceptDebit(now);
    round.start(now);

    const autoCashedOutBets = round.updateMultiplier(
      Multiplier.fromNumber(2),
      now,
    );

    expect(autoCashedOutBets).toHaveLength(1);

    const snapshot = bet.toSnapshot();

    expect(snapshot.status).toBe("CASHED_OUT_PENDING_CREDIT");
    expect(snapshot.autoCashoutMultiplier?.toNumber()).toBe(2);
    expect(snapshot.cashoutMultiplier?.toNumber()).toBe(2);
    expect(snapshot.payoutCents).toBe(2000n);
  });

  test("allows player to place another bet after a rejected bet in the same round", () => {
    const now = new Date("2026-05-22T00:00:00.000Z");

    const round = Round.create({
      id: "round-1",
      crashPoint: Multiplier.fromNumber(2),
      serverSeed: "server-seed",
      serverSeedHash: "server-seed-hash",
      publicSeed: "public-seed",
      nonce: 1,
      startsAt: new Date("2026-05-22T00:00:10.000Z"),
      now,
    });

    const firstBet = Bet.place({
      id: "bet-1",
      roundId: "round-1",
      playerId: "player",
      amount: BetAmount.fromCents(1_000n),
      now,
    });

    round.placeBet(firstBet);

    round.rejectBetDebit(
      "bet-1",
      "INSUFFICIENT_BALANCE",
      new Date("2026-05-22T00:00:01.000Z"),
    );

    const secondBet = Bet.place({
      id: "bet-2",
      roundId: "round-1",
      playerId: "player",
      amount: BetAmount.fromCents(500n),
      now: new Date("2026-05-22T00:00:02.000Z"),
    });

    round.placeBet(secondBet);

    const snapshot = round.toSnapshot();

    expect(snapshot.bets).toHaveLength(2);
    expect(snapshot.bets[0].status).toBe("REJECTED");
    expect(snapshot.bets[1].status).toBe("PENDING_DEBIT");
  });
});
