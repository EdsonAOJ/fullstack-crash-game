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

interface ApiSuccessEnvelope<TData> {
  success: true;
  timestamp: string;
  requestId: string;
  data: TData;
  meta: null;
}

interface ApiErrorEnvelope {
  success: false;
  timestamp: string;
  requestId: string;
  error: {
    code: string;
    message: string;
    statusCode: number;
    details?: Record<string, string>;
  };
}

interface LegacyNestErrorResponse {
  message: string | string[];
  error?: string;
  statusCode: number;
}

async function waitFor<T>(
  description: string,
  callback: () => Promise<T | null | false>,
  options: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 60_000;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWalletResponse(value: unknown): value is WalletResponse {
  return (
    isRecord(value) &&
    typeof value["id"] === "string" &&
    typeof value["playerId"] === "string" &&
    typeof value["balanceCents"] === "string"
  );
}

function isApiSuccessEnvelope<TData>(
  value: unknown,
  isData: (data: unknown) => data is TData,
): value is ApiSuccessEnvelope<TData> {
  if (!isRecord(value)) {
    return false;
  }

  if (value["success"] !== true) {
    return false;
  }

  if (typeof value["timestamp"] !== "string") {
    return false;
  }

  if (typeof value["requestId"] !== "string") {
    return false;
  }

  if (!Object.prototype.hasOwnProperty.call(value, "data")) {
    return false;
  }

  return isData(value["data"]);
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!isRecord(value)) {
    return false;
  }

  if (value["success"] !== false) {
    return false;
  }

  if (typeof value["timestamp"] !== "string") {
    return false;
  }

  if (typeof value["requestId"] !== "string") {
    return false;
  }

  const error = value["error"];

  return (
    isRecord(error) &&
    typeof error["code"] === "string" &&
    typeof error["message"] === "string" &&
    typeof error["statusCode"] === "number"
  );
}

function isLegacyNestErrorResponse(
  value: unknown,
): value is LegacyNestErrorResponse {
  return (
    isRecord(value) &&
    typeof value["statusCode"] === "number" &&
    Object.prototype.hasOwnProperty.call(value, "message") &&
    (typeof value["message"] === "string" || Array.isArray(value["message"]))
  );
}

function normalizeLegacyErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return "VALIDATION_ERROR";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

function normalizeLegacyMessage(message: string | string[]): string {
  if (Array.isArray(message)) {
    return message.join(", ");
  }

  return message;
}

async function parseWalletData(response: Response): Promise<WalletResponse> {
  const body: unknown = await response.json();

  if (isApiSuccessEnvelope(body, isWalletResponse)) {
    return body.data;
  }

  if (isWalletResponse(body)) {
    return body;
  }

  throw new Error(`Unexpected wallet response format: ${JSON.stringify(body)}`);
}

async function parseApiError(response: Response): Promise<ApiErrorEnvelope> {
  const body: unknown = await response.json();

  if (isApiErrorEnvelope(body)) {
    return body;
  }

  if (isLegacyNestErrorResponse(body)) {
    return {
      success: false,
      timestamp: new Date().toISOString(),
      requestId: "",
      error: {
        code: normalizeLegacyErrorCode(body.statusCode),
        message: normalizeLegacyMessage(body.message),
        statusCode: body.statusCode,
      },
    };
  }

  throw new Error(`Unexpected error response format: ${JSON.stringify(body)}`);
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

async function getMyWallet(token: string): Promise<WalletResponse> {
  const response = await fetch(`${KONG_URL}/wallets/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(`Failed to get my wallet: ${response.status} ${body}`);
  }

  return parseWalletData(response);
}

describe("Wallets E2E", () => {
  beforeAll(async () => {
    await waitForHttpOk(
      "Wallets service to be available through Kong",
      `${KONG_URL}/wallets/health`,
      {
        timeoutMs: 90_000,
        intervalMs: 1000,
      },
    );
  });

  test("returns the authenticated player's wallet", async () => {
    const token = await getAccessToken();

    const wallet = await getMyWallet(token);

    expect(wallet.id).toBeTruthy();
    expect(wallet.playerId).toBe("player");
    expect(wallet.balanceCents).toMatch(/^\d+$/);
  });

  test("rejects unauthenticated wallet access", async () => {
    const response = await fetch(`${KONG_URL}/wallets/me`);

    expect(response.status).toBe(401);

    const error = await parseApiError(response);

    expect(error.success).toBe(false);
    expect(error.error.statusCode).toBe(401);
    expect(error.error.code).toBe("UNAUTHORIZED");
  });

  test("does not create duplicated wallet for the same player", async () => {
    const token = await getAccessToken();

    const currentWallet = await getMyWallet(token);

    expect(currentWallet.playerId).toBe("player");

    const response = await fetch(`${KONG_URL}/wallets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(response.status).toBe(409);

    const error = await parseApiError(response);

    expect(error.success).toBe(false);
    expect(error.error.statusCode).toBe(409);
    expect(error.error.code).toBe("WALLET_ALREADY_EXISTS");
    expect(error.error.message).toContain("already exists");
  });
});
