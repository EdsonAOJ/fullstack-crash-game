export interface ApiEnvelope<TData> {
  success: boolean;
  timestamp?: string;
  requestId?: string;
  data: TData;
  meta?: unknown;
}

export interface ApiErrorEnvelope {
  success: false;
  timestamp?: string;
  requestId?: string;
  error?: {
    code?: string;
    message?: string;
    statusCode?: number;
    details?: Array<{
      path: string;
      message: string;
    }>;
  };
}

export interface Wallet {
  id: string;
  playerId: string;
  balanceCents: string;
}

export interface RoundBet {
  id: string;
  roundId?: string;
  playerId: string;
  amountCents: string;
  status: string;
  autoCashoutMultiplier?: number;
  cashoutMultiplier?: number;
  payoutCents?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentRound {
  id: string;
  status: string;
  crashPoint?: number;
  currentMultiplier: number;
  startsAt: string;
  startedAt?: string;
  crashedAt?: string;
  completedAt?: string;
  serverSeedHash?: string;
  bets: RoundBet[];
}

export interface LeaderboardItem {
  playerId: string;
  betsCount: number;
  cashoutsCount: number;
  lostBetsCount: number;
  totalWageredCents: string;
  totalPayoutCents: string;
  totalProfitCents: string;
}

export interface LeaderboardResponse {
  items: LeaderboardItem[];
}

export interface PlaceBetResponse {
  betId: string;
  roundId: string;
  playerId: string;
  amountCents: string;
  status: string;
  autoCashoutMultiplier?: number;
}

export interface CashoutResponse {
  betId: string;
  roundId: string;
  playerId: string;
  status: string;
  cashoutMultiplier: number;
  payoutCents: string;
}

export interface TokenResponse {
  accessToken: string;
}
