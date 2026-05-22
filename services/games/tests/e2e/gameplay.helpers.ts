const KONG_URL = process.env.E2E_KONG_URL ?? "http://localhost:8000";
const KEYCLOAK_URL = process.env.E2E_KEYCLOAK_URL ?? "http://localhost:8080";

const PLAYER_USERNAME = process.env.E2E_PLAYER_USERNAME ?? "player";
const PLAYER_PASSWORD = process.env.E2E_PLAYER_PASSWORD ?? "player123";
const CLIENT_ID = process.env.E2E_CLIENT_ID ?? "crash-game-client";

export { KONG_URL };

export interface WalletResponse {
  id: string;
  playerId: string;
  balanceCents: string;
}

export interface RoundResponse {
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
    autoCashoutMultiplier?: number;
    cashoutMultiplier?: number;
    payoutCents?: string;
    rejectionReason?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface BetResponse {
  betId: string;
  roundId: string;
  playerId: string;
  amountCents: string;
  status: string;
  autoCashoutMultiplier?: number;
  cashoutMultiplier?: number;
  payoutCents?: string;
  rejectionReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaceBetResponse {
  betId: string;
  roundId: string;
  playerId: string;
  amountCents: string;
  status: string;
  autoCashoutMultiplier?: number;
}

export interface HttpErrorResponse {
  status: number;
  body: string;
}

export interface RoundVerifyResponse {
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function parseApiData<TData>(response: Response): Promise<TData> {
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

export async function parseApiResponseData<TData>(
  response: Response,
): Promise<TData> {
  const body = (await response.json()) as unknown;

  if (
    isRecord(body) &&
    body["success"] === true &&
    Object.prototype.hasOwnProperty.call(body, "data")
  ) {
    return body["data"] as TData;
  }

  throw new Error(
    `Expected successful API response, received: ${JSON.stringify(body)}`,
  );
}

export async function waitFor<T>(
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

export async function waitForHttpOk(
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
      timeoutMs: options.timeoutMs ?? 90_000,
      intervalMs: options.intervalMs ?? 500,
    },
  );
}

export async function getAccessToken(): Promise<string> {
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

export async function getWallet(token: string): Promise<WalletResponse> {
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

export async function getCurrentRound(): Promise<RoundResponse | null> {
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

export async function getMyBet(token: string): Promise<BetResponse | null> {
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

export async function getBetById(
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

export async function tryPlaceBet(
  token: string,
  amountCents: string,
  autoCashoutMultiplier?: number,
): Promise<PlaceBetResponse | null> {
  const body: {
    amountCents: string;
    autoCashoutMultiplier?: number;
  } = {
    amountCents,
  };

  if (autoCashoutMultiplier !== undefined) {
    body.autoCashoutMultiplier = autoCashoutMultiplier;
  }

  const response = await fetch(`${KONG_URL}/games/bet`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (
    response.status === 409 ||
    response.status === 400 ||
    response.status === 404 ||
    response.status === 429
  ) {
    return null;
  }

  if (!response.ok) {
    const responseBody = await response.text();

    throw new Error(
      `Unexpected place bet error: ${response.status} ${responseBody}`,
    );
  }

  return parseApiResponseData<PlaceBetResponse>(response);
}

export async function expectPlaceBetToFail(
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

export async function tryCashout(token: string): Promise<BetResponse | null> {
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

export async function expectCashoutToFail(
  token: string,
): Promise<HttpErrorResponse> {
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

export async function getRoundVerify(
  roundId: string,
): Promise<RoundVerifyResponse | null> {
  const response = await fetch(`${KONG_URL}/games/rounds/${roundId}/verify`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to verify round: ${response.status} ${body}`);
  }

  return parseApiResponseData<RoundVerifyResponse>(response);
}

export async function getMyActiveBetOrNull(
  token: string,
): Promise<BetResponse | null> {
  try {
    const bet = await getMyBet(token);

    if (!bet) {
      return null;
    }

    if (
      bet.status === "PENDING_DEBIT" ||
      bet.status === "ACCEPTED" ||
      bet.status === "CASHED_OUT_PENDING_CREDIT"
    ) {
      return bet;
    }

    return null;
  } catch {
    return null;
  }
}

export async function waitForCleanBettingWindow(
  token: string,
): Promise<RoundResponse> {
  return waitFor(
    "clean betting window",
    async () => {
      const round = await getCurrentRound();
      const currentBet = await getMyActiveBetOrNull(token);

      if (round?.status === "WAITING_FOR_BETS" && !currentBet) {
        return round;
      }

      return null;
    },
    {
      timeoutMs: 90_000,
      intervalMs: 500,
    },
  );
}

export async function waitForRunningRoundWithoutActiveBet(
  token: string,
): Promise<RoundResponse> {
  return waitFor(
    "running round without current player bet",
    async () => {
      const round = await getCurrentRound();

      if (round?.status !== "RUNNING") {
        return null;
      }

      const currentBet = await getMyActiveBetOrNull(token);

      if (!currentBet) {
        return round;
      }

      return null;
    },
    {
      timeoutMs: 90_000,
      intervalMs: 500,
    },
  );
}

export async function getLatestCompletedRound(): Promise<RoundResponse | null> {
  const response = await fetch(`${KONG_URL}/games/rounds/latest`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to get latest round: ${response.status} ${body}`);
  }

  return parseApiResponseData<RoundResponse>(response);
}
