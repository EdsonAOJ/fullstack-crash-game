import { io, type Socket } from "socket.io-client";
import type { CurrentRound, RoundBet } from "./types";

export interface RoundRealtimePayload {
  id: string;
  status: string;
  crashPoint?: number;
  currentMultiplier: number;
  startsAt: string;
  startedAt?: string;
  crashedAt?: string;
  completedAt?: string;
}

export interface BetRealtimePayload {
  id: string;
  roundId: string;
  playerId: string;
  amountCents: string;
  status: string;
  autoCashoutMultiplier?: number;
  cashoutMultiplier?: number;
  payoutCents?: string;
  rejectionReason?: string;
}

export interface GameSocketHandlers {
  onReady?: () => void;
  onRound?: (payload: RoundRealtimePayload) => void;
  onBet?: (payload: BetRealtimePayload) => void;
  onDisconnect?: () => void;
}

export function connectGameSocket(handlers: GameSocketHandlers): Socket {
  const socketUrl =
    process.env.NEXT_PUBLIC_GAMES_SOCKET_URL ?? "http://localhost:4001/games";

  const socket = io(socketUrl, {
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
  });

  socket.on("connect", () => {
    console.log("[socket] connected", socket.id);
    handlers.onReady?.();
  });

  socket.on("connection.ready", (payload) => {
    console.log("[socket] connection.ready", payload);
    handlers.onReady?.();
  });

  socket.on("connect_error", (error) => {
    console.error("[socket] connect_error", error.message);
    handlers.onDisconnect?.();
  });

  const roundEvents = [
    "round.created",
    "round.started",
    "round.multiplier.updated",
    "round.crashed",
    "round.completed",
  ];

  for (const eventName of roundEvents) {
    socket.on(eventName, (payload: RoundRealtimePayload) => {
      console.log("[socket]", eventName, payload);
      handlers.onRound?.(payload);
    });
  }

  const betEvents = [
    "bet.placed",
    "bet.accepted",
    "bet.rejected",
    "bet.cashed_out",
  ];

  for (const eventName of betEvents) {
    socket.on(eventName, (payload: BetRealtimePayload) => {
      console.log("[socket]", eventName, payload);
      handlers.onBet?.(payload);
    });
  }

  socket.on("disconnect", (reason) => {
    console.warn("[socket] disconnected", reason);
    handlers.onDisconnect?.();
  });

  return socket;
}

export function applyRealtimeRound(
  currentRound: CurrentRound | null,
  payload: RoundRealtimePayload,
): CurrentRound {
  const isSameRound = currentRound?.id === payload.id;

  return {
    id: payload.id,
    status: payload.status,
    crashPoint: payload.crashPoint,
    currentMultiplier: payload.currentMultiplier,
    startsAt: payload.startsAt,
    startedAt: payload.startedAt,
    crashedAt: payload.crashedAt,
    completedAt: payload.completedAt,
    serverSeedHash: isSameRound ? currentRound.serverSeedHash : undefined,
    bets: isSameRound ? currentRound.bets : [],
  };
}

function mapRealtimeBetToRoundBet(payload: BetRealtimePayload): RoundBet {
  const now = new Date().toISOString();

  return {
    id: payload.id,
    roundId: payload.roundId,
    playerId: payload.playerId,
    amountCents: payload.amountCents,
    status: payload.status,
    autoCashoutMultiplier: payload.autoCashoutMultiplier,
    cashoutMultiplier: payload.cashoutMultiplier,
    payoutCents: payload.payoutCents,
    rejectionReason: payload.rejectionReason,
    createdAt: now,
    updatedAt: now,
  };
}

export function applyRealtimeBet(
  currentRound: CurrentRound | null,
  payload: BetRealtimePayload,
): CurrentRound | null {
  if (!currentRound || currentRound.id !== payload.roundId) {
    return currentRound;
  }

  const mappedBet = mapRealtimeBetToRoundBet(payload);

  const existingBetIndex = currentRound.bets.findIndex(
    (bet) => bet.id === mappedBet.id,
  );

  if (existingBetIndex === -1) {
    return {
      ...currentRound,
      bets: [...currentRound.bets, mappedBet],
    };
  }

  const nextBets = [...currentRound.bets];

  nextBets[existingBetIndex] = {
    ...nextBets[existingBetIndex],
    ...mappedBet,
    createdAt: nextBets[existingBetIndex].createdAt,
  };

  return {
    ...currentRound,
    bets: nextBets,
  };
}
