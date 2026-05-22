import { beforeAll, describe, expect, test } from "bun:test";

const KONG_URL = process.env.E2E_KONG_URL ?? "http://localhost:8000";
const KEYCLOAK_URL = process.env.E2E_KEYCLOAK_URL ?? "http://localhost:8080";

const PLAYER_USERNAME = process.env.E2E_PLAYER_USERNAME ?? "player";
const PLAYER_PASSWORD = process.env.E2E_PLAYER_PASSWORD ?? "player123";
const CLIENT_ID = process.env.E2E_CLIENT_ID ?? "crash-game-client";

interface WalletResponse {
  id: string;
  playerId: string;
  balanceCents: string;
}

interface RoundResponse {
  id: string;
  status: string;
  crashPoint?: number;
  currentMultiplier: number;
  startsAt: string;
  startedAt?: string;
  crashedAt?: string;
  completedAt?: string;
  serverSeedHash?: string;
  bets: Array<{
    id: string;
    playerId: string;
    amountCents: string;
    status: string;
    cashoutMultiplier?: number;
    payoutCents?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

interface BetResponse {
  betId: string;
  roundId: string;
  playerId: string;
  amountCents: string;
  status: string;
  cashoutMultiplier?: number;
  payoutCents?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface HttpErrorResponse {
  status: number;
  body: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseApiData<TData>(response: Response): Promise<TData> {
  const body = (await response.json()) as unknown;

  if (
    isRecord(body) &&
    body["success"] === true &&
    Object.prototype.hasOwnProperty.call(body, "data")
  ) {
    return body["data"] as TData;
  }

  return body as TData;
}

async function getAccessToken(): Promise<string> {
  const response = await fetch(
    `${KEYCLOAK_URL}/realms/crash-game/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        grant_type: "password",
        username: PLAYER_USERNAME,
        password: PLAYER_PASSWORD,
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to get access token: ${response.status} ${body}`);
  }

  const body = (await response.json()) as { access_token?: string };

  if (!body.access_token) {
    throw new Error("Keycloak response did not include access_token.");
  }

  return body.access_token;
}

async function getWallet(token: string): Promise<WalletResponse> {
  const response = await fetch(`${KONG_URL}/wallets/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to get wallet: ${response.status} ${body}`);
  }

  return parseApiData<WalletResponse>(response);
}

async function getCurrentRound(): Promise<RoundResponse | null> {
  const response = await fetch(`${KONG_URL}/games/rounds/current`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to get current round: ${response.status} ${body}`);
  }

  return parseApiData<RoundResponse>(response);
}

async function getMyBet(token: string): Promise<BetResponse | null> {
  const response = await fetch(`${KONG_URL}/games/bets/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to get my bet: ${response.status} ${body}`);
  }

  return parseApiData<BetResponse>(response);
}

async function getBetById(
  token: string,
  betId: string,
): Promise<BetResponse | null> {
  const response = await fetch(`${KONG_URL}/games/bets/${betId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to get bet by id: ${response.status} ${body}`);
  }

  return parseApiData<BetResponse>(response);
}

async function tryPlaceBet(
  token: string,
  amountCents: string,
): Promise<BetResponse | null> {
  const response = await fetch(`${KONG_URL}/games/bet`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amountCents,
    }),
  });

  if (response.ok) {
    return parseApiData<BetResponse>(response);
  }

  if (
    response.status === 404 ||
    response.status === 409 ||
    response.status === 400
  ) {
    return null;
  }

  const body = await response.text();

  throw new Error(`Unexpected place bet error: ${response.status} ${body}`);
}

async function expectPlaceBetToFail(
  token: string,
  amountCents: string,
): Promise<HttpErrorResponse> {
  const response = await fetch(`${KONG_URL}/games/bet`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amountCents,
    }),
  });

  const body = await response.text();

  if (response.ok) {
    throw new Error(`Expected place bet to fail, but it succeeded: ${body}`);
  }

  return {
    status: response.status,
    body,
  };
}

async function tryCashout(token: string): Promise<BetResponse | null> {
  const response = await fetch(`${KONG_URL}/games/bet/cashout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.ok) {
    return parseApiData<BetResponse>(response);
  }

  if (
    response.status === 404 ||
    response.status === 409 ||
    response.status === 400
  ) {
    return null;
  }

  const body = await response.text();

  throw new Error(`Unexpected cashout error: ${response.status} ${body}`);
}

async function expectCashoutToFail(token: string): Promise<HttpErrorResponse> {
  const response = await fetch(`${KONG_URL}/games/bet/cashout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await response.text();

  if (response.ok) {
    throw new Error(`Expected cashout to fail, but it succeeded: ${body}`);
  }

  return {
    status: response.status,
    body,
  };
}

async function waitFor<T>(
  description: string,
  callback: () => Promise<T | null | false>,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 20_000;
  const intervalMs = options.intervalMs ?? 500;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await callback();

    if (result) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${description}.`);
}

async function waitForHttpOk(
  description: string,
  url: string,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {},
): Promise<void> {
  await waitFor(
    description,
    async () => {
      try {
        const response = await fetch(url);

        if (response.ok) {
          return true;
        }

        return null;
      } catch {
        return null;
      }
    },
    {
      timeoutMs: options.timeoutMs ?? 60_000,
      intervalMs: options.intervalMs ?? 500,
    },
  );
}

async function parseApiResponseData<TData>(response: Response): Promise<TData> {
  const body = (await response.json()) as {
    success: boolean;
    data: TData;
  };

  expect(body.success).toBe(true);

  return body.data;
}

async function getLatestCompletedRound(): Promise<RoundResponse> {
  const response = await fetch(`${KONG_URL}/games/rounds/latest`);

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to get latest round: ${response.status} ${body}`);
  }

  return parseApiResponseData<RoundResponse>(response);
}

async function executeCashoutScenario(token: string): Promise<void> {
  const initialWallet = await getWallet(token);
  const initialBalance = BigInt(initialWallet.balanceCents);

  const placedBet = await waitFor(
    "bet to be placed during betting window",
    async () => tryPlaceBet(token, "1000"),
    {
      timeoutMs: 60_000,
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
      timeoutMs: 15_000,
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
      timeoutMs: 15_000,
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
      timeoutMs: 30_000,
      intervalMs: 250,
    },
  );

  const cashoutResponse = await waitFor(
    "cashout to be accepted while round is running",
    async () => tryCashout(token),
    {
      timeoutMs: 5_000,
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
      timeoutMs: 30_000,
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
      timeoutMs: 30_000,
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

          await waitFor(
            "next betting window before retrying cashout scenario",
            async () => {
              const round = await getCurrentRound();
              const currentBet = await getMyBet(token);

              if (round?.status === "WAITING_FOR_BETS" && !currentBet) {
                return true;
              }

              return null;
            },
            {
              timeoutMs: 45_000,
              intervalMs: 500,
            },
          );
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error("Cashout scenario failed after retries.");
    },
    {
      timeout: 180_000,
    },
  );

  test(
    "player places a bet and loses when the round crashes",
    async () => {
      const token = await getAccessToken();

      const initialWallet = await getWallet(token);
      const initialBalance = BigInt(initialWallet.balanceCents);

      const placedBet = await waitFor(
        "bet to be placed during betting window",
        async () => {
          return tryPlaceBet(token, "1000");
        },
        {
          timeoutMs: 60_000,
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
          timeoutMs: 10_000,
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
          timeoutMs: 10_000,
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
          timeoutMs: 45_000,
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
      timeout: 90_000,
    },
  );

  test(
    "player cannot place duplicated bets in the same round",
    async () => {
      const token = await getAccessToken();

      const firstBet = await waitFor(
        "first bet to be placed during betting window",
        async () => {
          return tryPlaceBet(token, "1000");
        },
        {
          timeoutMs: 60_000,
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
          timeoutMs: 10_000,
          intervalMs: 500,
        },
      );

      expect(["ACCEPTED", "REJECTED", "LOST", "CASHED_OUT"]).toContain(
        settledFirstBet.status,
      );
    },
    {
      timeout: 90_000,
    },
  );

  test(
    "player bet is rejected when wallet balance is insufficient",
    async () => {
      const token = await getAccessToken();

      const initialWallet = await getWallet(token);
      const initialBalance = BigInt(initialWallet.balanceCents);

      const amountGreaterThanBalance = initialBalance + 1000n;

      const placedBet = await waitFor(
        "bet with insufficient balance to be placed during betting window",
        async () => {
          return tryPlaceBet(token, amountGreaterThanBalance.toString());
        },
        {
          timeoutMs: 60_000,
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
          timeoutMs: 10_000,
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
      timeout: 90_000,
    },
  );

  test(
    "player cannot cashout without an accepted bet in the current round",
    async () => {
      const token = await getAccessToken();

      await waitFor(
        "running round without current player bet",
        async () => {
          const round = await getCurrentRound();

          if (round?.status !== "RUNNING") {
            return null;
          }

          const currentBet = await getMyBet(token);

          if (!currentBet) {
            return round;
          }

          return null;
        },
        {
          timeoutMs: 60_000,
          intervalMs: 500,
        },
      );

      const cashoutError = await expectCashoutToFail(token);

      expect([404, 409]).toContain(cashoutError.status);
      expect(cashoutError.body.length).toBeGreaterThan(0);
    },
    {
      timeout: 90_000,
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
      const currentRound = await waitFor(
        "non-completed current round for provably fair verification",
        async () => {
          const round = await getCurrentRound();

          if (
            round &&
            (round.status === "WAITING_FOR_BETS" || round.status === "RUNNING")
          ) {
            return round;
          }

          return null;
        },
        {
          timeoutMs: 30_000,
          intervalMs: 250,
        },
      );

      const earlyVerifyResponse = await fetch(
        `${KONG_URL}/games/rounds/${currentRound.id}/verify`,
      );

      expect(earlyVerifyResponse.status).toBe(200);

      const earlyVerify = await parseApiResponseData<{
        roundId: string;
        status: string;
        algorithm: "HMAC_SHA256";
        serverSeed?: string;
        serverSeedHash: string;
        publicSeed: string;
        nonce: number;
        crashPoint?: number;
        crashPointMultiplier?: number;
        calculatedCrashPoint?: number;
        calculatedCrashPointMultiplier?: number;
        isHashValid?: boolean;
        isCrashPointValid?: boolean;
        isRevealed: boolean;
      }>(earlyVerifyResponse);

      expect(earlyVerify.roundId).toBe(currentRound.id);
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
        "round to complete for provably fair verification",
        async () => {
          const latestRound = await getLatestCompletedRound();

          if (
            latestRound.id === currentRound.id &&
            latestRound.status === "COMPLETED"
          ) {
            return latestRound;
          }

          return null;
        },
        {
          timeoutMs: 30_000,
          intervalMs: 500,
        },
      );

      const revealedVerifyResponse = await fetch(
        `${KONG_URL}/games/rounds/${completedRound.id}/verify`,
      );

      expect(revealedVerifyResponse.status).toBe(200);

      const revealedVerify = await parseApiResponseData<{
        roundId: string;
        status: string;
        algorithm: "HMAC_SHA256";
        serverSeed: string;
        serverSeedHash: string;
        publicSeed: string;
        nonce: number;
        crashPoint: number;
        crashPointMultiplier: number;
        calculatedCrashPoint: number;
        calculatedCrashPointMultiplier: number;
        isHashValid: boolean;
        isCrashPointValid: boolean;
        isRevealed: boolean;
      }>(revealedVerifyResponse);

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

      expect(revealedVerify.crashPoint).toBe(
        revealedVerify.calculatedCrashPoint,
      );
      expect(revealedVerify.crashPointMultiplier).toBe(
        revealedVerify.calculatedCrashPointMultiplier,
      );

      expect(revealedVerify.isHashValid).toBe(true);
      expect(revealedVerify.isCrashPointValid).toBe(true);
    },
    {
      timeout: 60_000,
    },
  );
});
