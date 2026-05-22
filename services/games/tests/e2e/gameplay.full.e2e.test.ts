import { beforeAll, describe, expect, test } from "bun:test";
import {
  KONG_URL,
  expectCashoutToFail,
  expectPlaceBetToFail,
  getAccessToken,
  getBetById,
  getCurrentRound,
  getLatestCompletedRound,
  getRoundVerify,
  getWallet,
  tryCashout,
  tryPlaceBet,
  waitFor,
  waitForCleanBettingWindow,
  waitForHttpOk,
  waitForRunningRoundWithoutActiveBet,
} from "./gameplay.helpers";

async function executeCashoutScenario(token: string): Promise<void> {
  await waitForCleanBettingWindow(token);

  const initialWallet = await getWallet(token);
  const initialBalance = BigInt(initialWallet.balanceCents);

  const placedBet = await waitFor(
    "bet to be placed during betting window",
    async () => tryPlaceBet(token, "1000"),
    {
      timeoutMs: 90_000,
      intervalMs: 250,
    },
  );

  expect(placedBet.status).toBe("PENDING_DEBIT");
  expect(placedBet.amountCents).toBe("1000");

  const acceptedBet = await waitFor(
    "bet to be accepted",
    async () => {
      const bet = await getBetById(token, placedBet.betId);

      if (bet?.status === "ACCEPTED") {
        return bet;
      }

      if (bet?.status === "LOST" || bet?.status === "REJECTED") {
        throw new Error(
          `Bet cannot be cashed out anymore. Status: ${bet.status}`,
        );
      }

      return null;
    },
    {
      timeoutMs: 30_000,
      intervalMs: 500,
    },
  );

  expect(acceptedBet.betId).toBe(placedBet.betId);

  await waitFor(
    "wallet debit",
    async () => {
      const wallet = await getWallet(token);
      const balance = BigInt(wallet.balanceCents);

      if (balance === initialBalance - 1000n) {
        return wallet;
      }

      return null;
    },
    {
      timeoutMs: 30_000,
      intervalMs: 500,
    },
  );

  await waitFor(
    "bet round to be running",
    async () => {
      const round = await getCurrentRound();

      if (round?.id === placedBet.roundId && round.status === "RUNNING") {
        return round;
      }

      return null;
    },
    {
      timeoutMs: 60_000,
      intervalMs: 250,
    },
  );

  const cashoutResponse = await waitFor(
    "cashout to be accepted while round is running",
    async () => tryCashout(token),
    {
      timeoutMs: 10_000,
      intervalMs: 100,
    },
  );

  expect(cashoutResponse.betId).toBe(placedBet.betId);
  expect(cashoutResponse.roundId).toBe(placedBet.roundId);
  expect(cashoutResponse.status).toBe("CASHED_OUT_PENDING_CREDIT");
  expect(cashoutResponse.payoutCents).toBeDefined();

  const finalBet = await waitFor(
    "bet to be cashed out",
    async () => {
      const bet = await getBetById(token, placedBet.betId);

      if (bet?.status === "CASHED_OUT") {
        return bet;
      }

      if (bet?.status === "LOST") {
        throw new Error("Bet was lost before cashout settlement.");
      }

      return null;
    },
    {
      timeoutMs: 60_000,
      intervalMs: 500,
    },
  );

  const payout = BigInt(finalBet.payoutCents ?? "0");

  const finalWallet = await waitFor(
    "wallet credit",
    async () => {
      const wallet = await getWallet(token);
      const balance = BigInt(wallet.balanceCents);

      if (balance === initialBalance - 1000n + payout) {
        return wallet;
      }

      return null;
    },
    {
      timeoutMs: 60_000,
      intervalMs: 500,
    },
  );

  expect(BigInt(finalWallet.balanceCents)).toBe(
    initialBalance - 1000n + payout,
  );
}

async function executeAutoCashoutScenario(token: string): Promise<void> {
  await waitForCleanBettingWindow(token);

  const initialWallet = await getWallet(token);
  const initialBalance = BigInt(initialWallet.balanceCents);

  const placedBet = await waitFor(
    "bet with auto cashout to be placed during betting window",
    async () => tryPlaceBet(token, "1000", 1.01),
    {
      timeoutMs: 90_000,
      intervalMs: 250,
    },
  );

  expect(placedBet.status).toBe("PENDING_DEBIT");
  expect(placedBet.amountCents).toBe("1000");
  expect(placedBet.autoCashoutMultiplier).toBe(1.01);

  await waitFor(
    "auto cashout bet to be accepted",
    async () => {
      const bet = await getBetById(token, placedBet.betId);

      if (bet?.status === "ACCEPTED") {
        return bet;
      }

      if (bet?.status === "REJECTED" || bet?.status === "LOST") {
        throw new Error(
          `Auto cashout bet cannot continue. Status: ${bet.status}`,
        );
      }

      return null;
    },
    {
      timeoutMs: 30_000,
      intervalMs: 500,
    },
  );

  const finalBet = await waitFor(
    "auto cashout bet to be cashed out",
    async () => {
      const bet = await getBetById(token, placedBet.betId);

      if (bet?.status === "CASHED_OUT") {
        return bet;
      }

      if (bet?.status === "LOST" || bet?.status === "REJECTED") {
        throw new Error(`Auto cashout failed. Status: ${bet.status}`);
      }

      return null;
    },
    {
      timeoutMs: 120_000,
      intervalMs: 500,
    },
  );

  expect(finalBet.status).toBe("CASHED_OUT");
  expect(finalBet.cashoutMultiplier).toBeDefined();
  expect(finalBet.payoutCents).toBeDefined();

  const payout = BigInt(finalBet.payoutCents ?? "0");

  expect(payout).toBeGreaterThan(1000n);

  const finalWallet = await waitFor(
    "wallet balance to include auto cashout payout",
    async () => {
      const wallet = await getWallet(token);
      const balance = BigInt(wallet.balanceCents);

      if (balance === initialBalance - 1000n + payout) {
        return wallet;
      }

      return null;
    },
    {
      timeoutMs: 90_000,
      intervalMs: 500,
    },
  );

  expect(BigInt(finalWallet.balanceCents)).toBe(
    initialBalance - 1000n + payout,
  );
}

describe("Gameplay E2E", () => {
  beforeAll(async () => {
    await waitForHttpOk(
      "Games service to be available through Kong",
      `${KONG_URL}/games/health`,
    );

    await waitForHttpOk(
      "Wallets service to be available through Kong",
      `${KONG_URL}/wallets/health`,
    );
  });

  test(
    "player places a bet, cashes out, and wallet balance is updated",
    async () => {
      const token = await getAccessToken();

      let lastError: unknown;

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        try {
          await executeCashoutScenario(token);
          return;
        } catch (error) {
          lastError = error;
          await waitForCleanBettingWindow(token);
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error("Cashout scenario failed after retries.");
    },
    {
      timeout: 240_000,
    },
  );

  test(
    "player places a bet and loses when the round crashes",
    async () => {
      const token = await getAccessToken();

      await waitForCleanBettingWindow(token);

      const initialWallet = await getWallet(token);
      const initialBalance = BigInt(initialWallet.balanceCents);

      const placedBet = await waitFor(
        "bet to be placed during betting window",
        async () => tryPlaceBet(token, "1000"),
        {
          timeoutMs: 90_000,
          intervalMs: 250,
        },
      );

      expect(placedBet.status).toBe("PENDING_DEBIT");
      expect(placedBet.amountCents).toBe("1000");

      const acceptedBet = await waitFor(
        "bet to be accepted",
        async () => {
          const bet = await getBetById(token, placedBet.betId);

          if (bet?.status === "ACCEPTED") {
            return bet;
          }

          return null;
        },
        {
          timeoutMs: 30_000,
          intervalMs: 500,
        },
      );

      expect(acceptedBet.betId).toBe(placedBet.betId);
      expect(acceptedBet.roundId).toBe(placedBet.roundId);
      expect(acceptedBet.status).toBe("ACCEPTED");

      const walletAfterDebit = await waitFor(
        "wallet debit",
        async () => {
          const wallet = await getWallet(token);
          const balance = BigInt(wallet.balanceCents);

          if (balance === initialBalance - 1000n) {
            return wallet;
          }

          return null;
        },
        {
          timeoutMs: 30_000,
          intervalMs: 500,
        },
      );

      expect(BigInt(walletAfterDebit.balanceCents)).toBe(
        initialBalance - 1000n,
      );

      const lostBet = await waitFor(
        "bet to be lost after round crashes",
        async () => {
          const bet = await getBetById(token, placedBet.betId);

          if (bet?.status === "LOST") {
            return bet;
          }

          return null;
        },
        {
          timeoutMs: 120_000,
          intervalMs: 500,
        },
      );

      expect(lostBet.betId).toBe(placedBet.betId);
      expect(lostBet.roundId).toBe(placedBet.roundId);
      expect(lostBet.status).toBe("LOST");

      const finalWallet = await getWallet(token);

      expect(BigInt(finalWallet.balanceCents)).toBe(initialBalance - 1000n);
    },
    {
      timeout: 180_000,
    },
  );

  test(
    "player cannot place duplicated bets in the same round",
    async () => {
      const token = await getAccessToken();

      await waitForCleanBettingWindow(token);

      const firstBet = await waitFor(
        "first bet to be placed during betting window",
        async () => tryPlaceBet(token, "1000"),
        {
          timeoutMs: 90_000,
          intervalMs: 250,
        },
      );

      expect(firstBet.status).toBe("PENDING_DEBIT");
      expect(firstBet.amountCents).toBe("1000");

      const duplicatedBetError = await expectPlaceBetToFail(token, "1000");

      expect(duplicatedBetError.status).toBe(409);
      expect(duplicatedBetError.body).toContain("already has a bet");

      const settledFirstBet = await waitFor(
        "first duplicated-bet test bet to leave pending debit",
        async () => {
          const bet = await getBetById(token, firstBet.betId);

          if (bet && bet.status !== "PENDING_DEBIT") {
            return bet;
          }

          return null;
        },
        {
          timeoutMs: 60_000,
          intervalMs: 500,
        },
      );

      expect(["ACCEPTED", "REJECTED", "LOST", "CASHED_OUT"]).toContain(
        settledFirstBet.status,
      );
    },
    {
      timeout: 120_000,
    },
  );

  test(
    "player bet is rejected when wallet balance is insufficient",
    async () => {
      const token = await getAccessToken();

      await waitForCleanBettingWindow(token);

      const initialWallet = await getWallet(token);
      const initialBalance = BigInt(initialWallet.balanceCents);
      const amountGreaterThanBalance = initialBalance + 1000n;

      const placedBet = await waitFor(
        "bet with insufficient balance to be placed during betting window",
        async () => tryPlaceBet(token, amountGreaterThanBalance.toString()),
        {
          timeoutMs: 90_000,
          intervalMs: 250,
        },
      );

      expect(placedBet.status).toBe("PENDING_DEBIT");
      expect(placedBet.amountCents).toBe(amountGreaterThanBalance.toString());

      const rejectedBet = await waitFor(
        "bet to be rejected by wallet",
        async () => {
          const bet = await getBetById(token, placedBet.betId);

          if (bet?.status === "REJECTED") {
            return bet;
          }

          return null;
        },
        {
          timeoutMs: 30_000,
          intervalMs: 500,
        },
      );

      expect(rejectedBet.betId).toBe(placedBet.betId);
      expect(rejectedBet.roundId).toBe(placedBet.roundId);
      expect(rejectedBet.status).toBe("REJECTED");
      expect(rejectedBet.rejectionReason).toBeDefined();

      const finalWallet = await getWallet(token);

      expect(BigInt(finalWallet.balanceCents)).toBe(initialBalance);
    },
    {
      timeout: 120_000,
    },
  );

  test(
    "player cannot cashout without an accepted bet in the current round",
    async () => {
      const token = await getAccessToken();

      await waitForRunningRoundWithoutActiveBet(token);

      const cashoutError = await expectCashoutToFail(token);

      expect([404, 409]).toContain(cashoutError.status);
      expect(cashoutError.body.length).toBeGreaterThan(0);
    },
    {
      timeout: 120_000,
    },
  );

  test("rejects invalid rounds history limit", async () => {
    const response = await fetch(`${KONG_URL}/games/rounds/history?limit=abc`);

    expect(response.status).toBe(400);

    const body = (await response.json()) as {
      success?: boolean;
      error?: {
        code?: string;
        statusCode?: number;
        message?: string;
      };
    };

    expect(body.success).toBe(false);
    expect(body.error?.statusCode).toBe(400);
    expect(body.error?.code).toBe("VALIDATION_ERROR");
  });
  test(
    "returns provably fair verification data without revealing the server seed before round completion",
    async () => {
      const unrevealed = await waitFor(
        "unrevealed round verification",
        async () => {
          const round = await getCurrentRound();

          if (
            !round ||
            (round.status !== "WAITING_FOR_BETS" && round.status !== "RUNNING")
          ) {
            return null;
          }

          const verification = await getRoundVerify(round.id);

          if (verification && !verification.isRevealed) {
            return {
              round,
              verification,
            };
          }

          return null;
        },
        {
          timeoutMs: 60_000,
          intervalMs: 500,
        },
      );

      const earlyVerify = unrevealed.verification;

      expect(earlyVerify.roundId).toBe(unrevealed.round.id);
      expect(earlyVerify.algorithm).toBe("HMAC_SHA256");
      expect(earlyVerify.serverSeedHash).toBeTruthy();
      expect(earlyVerify.publicSeed).toBeTruthy();
      expect(typeof earlyVerify.nonce).toBe("number");

      expect(earlyVerify.isRevealed).toBe(false);
      expect(earlyVerify.serverSeed).toBeUndefined();
      expect(earlyVerify.crashPoint).toBeUndefined();
      expect(earlyVerify.crashPointMultiplier).toBeUndefined();
      expect(earlyVerify.calculatedCrashPoint).toBeUndefined();
      expect(earlyVerify.calculatedCrashPointMultiplier).toBeUndefined();
      expect(earlyVerify.isHashValid).toBeUndefined();
      expect(earlyVerify.isCrashPointValid).toBeUndefined();

      const completedRound = await waitFor(
        "latest completed round",
        async () => getLatestCompletedRound(),
        {
          timeoutMs: 60_000,
          intervalMs: 500,
        },
      );

      const revealedVerify = await waitFor(
        "latest completed round verification to be revealed",
        async () => {
          const verification = await getRoundVerify(completedRound.id);

          if (verification?.isRevealed) {
            return verification;
          }

          return null;
        },
        {
          timeoutMs: 10_000,
          intervalMs: 500,
        },
      );

      expect(revealedVerify.roundId).toBe(completedRound.id);
      expect(revealedVerify.status).toBe("COMPLETED");
      expect(revealedVerify.algorithm).toBe("HMAC_SHA256");
      expect(revealedVerify.isRevealed).toBe(true);

      expect(revealedVerify.serverSeed).toBeTruthy();
      expect(revealedVerify.serverSeedHash).toBeTruthy();
      expect(revealedVerify.publicSeed).toBeTruthy();

      expect(typeof revealedVerify.nonce).toBe("number");
      expect(typeof revealedVerify.crashPoint).toBe("number");
      expect(typeof revealedVerify.crashPointMultiplier).toBe("number");
      expect(typeof revealedVerify.calculatedCrashPoint).toBe("number");
      expect(typeof revealedVerify.calculatedCrashPointMultiplier).toBe(
        "number",
      );

      expect(revealedVerify.crashPointMultiplier).toBe(
        revealedVerify.calculatedCrashPointMultiplier,
      );

      expect(
        Math.abs(
          (revealedVerify.crashPoint ?? 0) -
            (revealedVerify.calculatedCrashPoint ?? 0),
        ),
      ).toBeLessThanOrEqual(0.01);

      expect(revealedVerify.isHashValid).toBe(true);
      expect(revealedVerify.isCrashPointValid).toBe(true);
    },
    {
      timeout: 90_000,
    },
  );

  test(
    "player places a bet with auto cashout and receives wallet credit automatically",
    async () => {
      const token = await getAccessToken();

      let lastError: unknown;

      for (let attempt = 1; attempt <= 5; attempt += 1) {
        try {
          await executeAutoCashoutScenario(token);
          return;
        } catch (error) {
          lastError = error;
          await waitForCleanBettingWindow(token);
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error("Auto cashout scenario failed after retries.");
    },
    {
      timeout: 300_000,
    },
  );
});
