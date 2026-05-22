import type {
  ApiEnvelope,
  CashoutResponse,
  CurrentRound,
  LeaderboardResponse,
  PlaceBetResponse,
  TokenResponse,
  Wallet,
} from "./types";

async function parseApiEnvelope<TData>(response: Response): Promise<TData> {
  const body = (await response.json()) as
    | ApiEnvelope<TData>
    | {
        success?: false;
        error?:
          | string
          | {
              code?: string;
              message?: string;
              statusCode?: number;
              details?: Array<{
                path: string;
                message: string;
              }>;
            };
      };

  if (!response.ok) {
    if ("error" in body && body.error) {
      if (typeof body.error === "string") {
        throw new Error(body.error);
      }

      if (body.error.message) {
        throw new Error(body.error.message);
      }

      if (body.error.code) {
        throw new Error(body.error.code);
      }
    }

    throw new Error(`Request failed with status ${response.status}`);
  }

  if ("success" in body && body.success === true) {
    return body.data;
  }

  throw new Error("Unexpected API response.");
}
export async function getAccessToken(): Promise<string> {
  const response = await fetch("/api/auth/token", {
    method: "POST",
  });

  const data = await parseApiEnvelope<TokenResponse>(response);

  return data.accessToken;
}

export async function getCurrentRound(): Promise<CurrentRound> {
  const response = await fetch("/api/proxy/games/rounds/current", {
    cache: "no-store",
  });

  return parseApiEnvelope<CurrentRound>(response);
}

export async function getWallet(accessToken: string): Promise<Wallet> {
  const response = await fetch("/api/proxy/wallets/me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  return parseApiEnvelope<Wallet>(response);
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const response = await fetch("/api/proxy/games/leaderboard?limit=10", {
    cache: "no-store",
  });

  return parseApiEnvelope<LeaderboardResponse>(response);
}

export async function placeBet(params: {
  accessToken: string;
  amountCents: string;
  autoCashoutMultiplier?: number;
}): Promise<PlaceBetResponse> {
  const response = await fetch("/api/proxy/games/bet", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amountCents: params.amountCents,
      autoCashoutMultiplier: params.autoCashoutMultiplier,
    }),
  });

  return parseApiEnvelope<PlaceBetResponse>(response);
}

export async function cashoutBet(
  accessToken: string,
): Promise<CashoutResponse> {
  const response = await fetch("/api/proxy/games/bet/cashout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return parseApiEnvelope<CashoutResponse>(response);
}
