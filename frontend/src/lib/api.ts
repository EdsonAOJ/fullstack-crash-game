import type {
  ApiEnvelope,
  CashoutResponse,
  CurrentRound,
  LeaderboardResponse,
  PlaceBetResponse,
  PlayerBetHistoryResponse,
  RoundHistoryResponse,
  RoundVerification,
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

export async function getCurrentRound(): Promise<CurrentRound> {
  const response = await fetch("/api/proxy/games/rounds/current", {
    cache: "no-store",
  });

  return parseApiEnvelope<CurrentRound>(response);
}

export async function getWallet(): Promise<Wallet> {
  const response = await fetch("/api/proxy/wallets/me", {
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
  amountCents: string;
  autoCashoutMultiplier?: number;
}): Promise<PlaceBetResponse> {
  const response = await fetch("/api/proxy/games/bet", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amountCents: params.amountCents,
      autoCashoutMultiplier: params.autoCashoutMultiplier,
    }),
  });

  return parseApiEnvelope<PlaceBetResponse>(response);
}

export async function cashoutBet(): Promise<CashoutResponse> {
  const response = await fetch("/api/proxy/games/bet/cashout", {
    method: "POST",
  });

  return parseApiEnvelope<CashoutResponse>(response);
}

export async function getRoundHistory(): Promise<RoundHistoryResponse> {
  const response = await fetch("/api/proxy/games/rounds/history?limit=20", {
    cache: "no-store",
  });

  return parseApiEnvelope<RoundHistoryResponse>(response);
}

export async function getRoundVerification(
  roundId: string,
): Promise<RoundVerification> {
  const response = await fetch(`/api/proxy/games/rounds/${roundId}/verify`, {
    cache: "no-store",
  });

  return parseApiEnvelope<RoundVerification>(response);
}

export async function getMyBets(): Promise<PlayerBetHistoryResponse> {
  const response = await fetch("/api/proxy/games/bets/me?limit=10", {
    cache: "no-store",
  });

  return parseApiEnvelope<PlayerBetHistoryResponse>(response);
}

export async function createWallet(): Promise<Wallet> {
  const response = await fetch("/api/proxy/wallets", {
    method: "POST",
    cache: "no-store",
  });

  return parseApiEnvelope<Wallet>(response);
}

export async function getOrCreateWallet(): Promise<Wallet> {
  try {
    return await getWallet();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    const shouldCreateWallet =
      message.toLowerCase().includes("not found") ||
      message.toLowerCase().includes("wallet") ||
      message.toLowerCase().includes("carteira");

    if (!shouldCreateWallet) {
      throw error;
    }

    return createWallet();
  }
}
