"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import {
  cashoutBet,
  getCurrentRound,
  getLeaderboard,
  getMyBets,
  getRoundHistory,
  getWallet,
  placeBet,
} from "@/lib/api";
import { gameQueryKeys } from "@/lib/query-keys";
import {
  formatCents,
  formatMultiplier,
  getBetStatusLabel,
  getRoundStatusLabel,
  reaisToCents,
} from "@/lib/format";
import type { CurrentRound, PlayerBetHistoryItem } from "@/lib/types";
import {
  applyRealtimeBet,
  applyRealtimeRound,
  connectGameSocket,
} from "@/lib/game-socket";
import { useAuth } from "@/providers/AuthProvider";
import { BettingPanel } from "./BettingPanel";
import { CrashGraph } from "./CrashGraph";
import { CurrentBetsTable } from "./CurrentBetsTable";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { MyBetCard } from "./MyBetCard";
import { RoundHistoryStrip } from "./RoundHistoryStrip";
import { StatusBadge } from "./StatusBadge";
import { WalletCard } from "./WalletCard";
import { ProvablyFairPanel } from "./ProvablyFairPanel";
import { MyBetsHistoryPanel } from "./MyBetsHistoryPanel";

function getSocketTone(status: string): "green" | "red" | "neutral" {
  return status === "Conectado"
    ? "green"
    : status === "Desconectado"
      ? "red"
      : "neutral";
}

function getAuthTone(
  isAuthenticated: boolean,
  isLoading: boolean,
): "green" | "red" | "yellow" | "neutral" {
  if (isLoading) return "yellow";
  if (isAuthenticated) return "green";

  return "red";
}

function getRoundTone(status?: string): "green" | "red" | "yellow" | "neutral" {
  if (status === "RUNNING") return "green";
  if (status === "CRASHED") return "red";
  if (status === "WAITING_FOR_BETS") return "yellow";

  return "neutral";
}

function getAuthLabel(isAuthenticated: boolean, isLoading: boolean): string {
  if (isLoading) return "Auth: carregando sessão";
  if (isAuthenticated) return "Auth: autenticado";

  return "Auth: não autenticado";
}

function isActiveBetStatus(status?: string): boolean {
  return Boolean(
    status?.match(
      /PENDING_DEBIT|ACCEPTED|CASHED_OUT_PENDING_CREDIT|CASHED_OUT/,
    ),
  );
}

export function GameDashboard() {
  const queryClient = useQueryClient();
  const auth = useAuth();

  const [amountReais, setAmountReais] = useState("10");
  const [autoCashoutMultiplier, setAutoCashoutMultiplier] = useState("2.00");
  const [message, setMessage] = useState<string>("Inicializando...");
  const [socketStatus, setSocketStatus] = useState("Desconectado");
  const [nowMs, setNowMs] = useState(0);

  const amountCents = useMemo(() => reaisToCents(amountReais), [amountReais]);

  const currentRoundQuery = useQuery({
    queryKey: gameQueryKeys.currentRound,
    queryFn: getCurrentRound,
    refetchInterval: 5000,
  });

  const leaderboardQuery = useQuery({
    queryKey: gameQueryKeys.leaderboard,
    queryFn: getLeaderboard,
    refetchInterval: 5000,
  });

  const roundHistoryQuery = useQuery({
    queryKey: gameQueryKeys.roundHistory,
    queryFn: getRoundHistory,
    refetchInterval: 5000,
  });

  const walletQuery = useQuery({
    queryKey: gameQueryKeys.wallet,
    queryFn: getWallet,
    enabled: auth.isAuthenticated,
    refetchInterval: 5000,
  });

  const myBetsQuery = useQuery({
    queryKey: gameQueryKeys.myBets,
    queryFn: getMyBets,
    enabled: auth.isAuthenticated,
    refetchInterval: 5000,
  });

  const round = currentRoundQuery.data ?? null;
  const wallet = walletQuery.data ?? null;
  const leaderboard = leaderboardQuery.data?.items ?? [];
  const roundHistory = roundHistoryQuery.data?.items ?? [];
  const myBetsHistory: PlayerBetHistoryItem[] = myBetsQuery.data?.items ?? [];

  const latestCompletedRoundId = roundHistory[0]?.id;

  const myLatestBet = useMemo(() => {
    if (!round || !wallet) {
      return null;
    }

    return round.bets.find((bet) => bet.playerId === wallet.playerId) ?? null;
  }, [round, wallet]);

  const amountError = useMemo(() => {
    const cents = BigInt(amountCents);

    if (cents < BigInt(100)) {
      return "A aposta mínima é R$ 1,00.";
    }

    if (cents > BigInt(100000)) {
      return "A aposta máxima é R$ 1.000,00.";
    }

    return null;
  }, [amountCents]);

  const myAcceptedBet = useMemo(() => {
    if (!round || !wallet) {
      return null;
    }

    return (
      round.bets.find(
        (bet) => bet.playerId === wallet.playerId && bet.status === "ACCEPTED",
      ) ?? null
    );
  }, [round, wallet]);

  const canBet =
    auth.isAuthenticated &&
    Boolean(wallet) &&
    round?.status === "WAITING_FOR_BETS" &&
    !isActiveBetStatus(myLatestBet?.status) &&
    amountError === null;

  const canCashout =
    auth.isAuthenticated &&
    Boolean(wallet) &&
    round?.status === "RUNNING" &&
    Boolean(myAcceptedBet);

  const betDisabledReason = useMemo(() => {
    if (auth.isLoading) return "sessão ainda está carregando";
    if (!auth.isAuthenticated) return "usuário não autenticado";
    if (!wallet) return "carteira ainda não carregada";
    if (amountError) return amountError;
    if (round?.status !== "WAITING_FOR_BETS") return "fora da fase de apostas";

    if (isActiveBetStatus(myLatestBet?.status)) {
      return "você já possui uma aposta ativa ou liquidada nesta rodada";
    }

    return null;
  }, [
    amountError,
    auth.isAuthenticated,
    auth.isLoading,
    myLatestBet,
    round?.status,
    wallet,
  ]);

  const cashoutDisabledReason = useMemo(() => {
    if (auth.isLoading) return "sessão ainda está carregando";
    if (!auth.isAuthenticated) return "usuário não autenticado";
    if (!wallet) return "carteira ainda não carregada";
    if (round?.status !== "RUNNING") return "rodada não está em andamento";
    if (!myAcceptedBet) return "não existe aposta ativa para sacar";

    return null;
  }, [
    auth.isAuthenticated,
    auth.isLoading,
    myAcceptedBet,
    round?.status,
    wallet,
  ]);

  const countdownSeconds = useMemo(() => {
    if (
      !round?.startsAt ||
      round.status !== "WAITING_FOR_BETS" ||
      nowMs === 0
    ) {
      return null;
    }

    const diffMs = new Date(round.startsAt).getTime() - nowMs;

    return Math.max(0, Math.ceil(diffMs / 1000));
  }, [nowMs, round]);

  const potentialPayoutCents = useMemo(() => {
    if (!myAcceptedBet || !round) {
      return null;
    }

    const payout =
      (BigInt(myAcceptedBet.amountCents) *
        BigInt(Math.floor(round.currentMultiplier * 100))) /
      BigInt(100);

    return payout.toString();
  }, [myAcceptedBet, round]);

  const myBetProfitCents = useMemo(() => {
    if (!myLatestBet?.payoutCents) {
      return null;
    }

    return (
      BigInt(myLatestBet.payoutCents) - BigInt(myLatestBet.amountCents)
    ).toString();
  }, [myLatestBet]);

  const invalidateGameData = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: gameQueryKeys.currentRound,
    });
    void queryClient.invalidateQueries({
      queryKey: gameQueryKeys.leaderboard,
    });
    void queryClient.invalidateQueries({
      queryKey: gameQueryKeys.roundHistory,
    });

    if (auth.isAuthenticated) {
      void queryClient.invalidateQueries({
        queryKey: gameQueryKeys.wallet,
      });
      void queryClient.invalidateQueries({
        queryKey: gameQueryKeys.myBets,
      });
    }
  }, [auth.isAuthenticated, queryClient]);

  const placeBetMutation = useMutation({
    mutationFn: async () => {
      const parsedAutoCashout = autoCashoutMultiplier
        ? Number(autoCashoutMultiplier.replace(",", "."))
        : undefined;

      return placeBet({
        amountCents,
        autoCashoutMultiplier: Number.isFinite(parsedAutoCashout)
          ? parsedAutoCashout
          : undefined,
      });
    },
    onSuccess: async (bet) => {
      const nextMessage = `Aposta criada com status ${getBetStatusLabel(
        bet.status,
      )}.`;

      setMessage(nextMessage);
      toast.success(nextMessage);

      invalidateGameData();
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao apostar.";

      setMessage(errorMessage);
      toast.error(errorMessage);
    },
  });

  const cashoutMutation = useMutation({
    mutationFn: cashoutBet,
    onSuccess: (result) => {
      const nextMessage = `Cashout solicitado em ${formatMultiplier(
        result.cashoutMultiplier,
      )}. Payout: ${formatCents(result.payoutCents)}.`;

      setMessage(nextMessage);
      toast.success(nextMessage);

      invalidateGameData();
    },
    onError: (error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Erro no cashout.";

      setMessage(errorMessage);
      toast.error(errorMessage);
    },
  });

  const isLoading =
    auth.isLoading ||
    placeBetMutation.isPending ||
    cashoutMutation.isPending ||
    currentRoundQuery.isLoading;

  const dashboardMessage = useMemo(() => {
    if (!auth.isAuthenticated && !auth.isLoading) {
      return "Faça login com Keycloak para carregar carteira e apostar.";
    }

    if (currentRoundQuery.isError) {
      return "Não foi possível carregar a rodada atual.";
    }

    if (walletQuery.isError) {
      return "Não foi possível carregar a carteira.";
    }

    return message;
  }, [
    auth.isAuthenticated,
    auth.isLoading,
    currentRoundQuery.isError,
    message,
    walletQuery.isError,
  ]);

  function handleLogin(): void {
    auth.login();
  }

  async function handleLogout(): Promise<void> {
    await auth.logout();
  }

  async function handlePlaceBet(): Promise<void> {
    if (!auth.isAuthenticated) {
      toast.error("Faça login antes de apostar.");
      setMessage("Faça login antes de apostar.");
      return;
    }

    if (amountError) {
      toast.error(amountError);
      setMessage(amountError);
      return;
    }

    placeBetMutation.mutate();
  }

  async function handleCashout(): Promise<void> {
    if (!auth.isAuthenticated) {
      toast.error("Faça login antes de sacar.");
      setMessage("Faça login antes de sacar.");
      return;
    }

    cashoutMutation.mutate();
  }

  useEffect(() => {
    const updateNow = () => {
      setNowMs(Date.now());
    };

    const timeoutId = window.setTimeout(updateNow, 0);
    const intervalId = window.setInterval(updateNow, 250);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const socket = connectGameSocket({
      onReady: () => {
        setSocketStatus("Conectado");
      },
      onRound: (payload) => {
        queryClient.setQueryData<CurrentRound | undefined>(
          gameQueryKeys.currentRound,
          (currentRound) =>
            applyRealtimeRound(currentRound ?? null, payload) ?? currentRound,
        );

        if (
          payload.status === "CRASHED" ||
          payload.status === "COMPLETED" ||
          payload.status === "WAITING_FOR_BETS"
        ) {
          invalidateGameData();
        }
      },
      onBet: (payload) => {
        queryClient.setQueryData<CurrentRound | undefined>(
          gameQueryKeys.currentRound,
          (currentRound) =>
            applyRealtimeBet(currentRound ?? null, payload) ?? currentRound,
        );

        if (
          payload.status === "ACCEPTED" ||
          payload.status === "REJECTED" ||
          payload.status === "CASHED_OUT" ||
          payload.status === "CASHED_OUT_PENDING_CREDIT" ||
          payload.status === "LOST"
        ) {
          invalidateGameData();
        }
      },
      onDisconnect: () => {
        setSocketStatus("Desconectado");
      },
    });

    return () => {
      socket.disconnect();
    };
  }, [invalidateGameData, queryClient]);

  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] px-4 py-5 text-slate-100 md:px-8">
      <Toaster richColors position="top-right" />

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0),rgba(2,6,23,0.92))]" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-5">
        {isLoading && !wallet ? (
          <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
            <div className="flex animate-pulse flex-col gap-4">
              <div className="h-4 w-48 rounded-full bg-white/10" />
              <div className="h-10 w-72 rounded-full bg-white/10" />
              <div className="grid gap-3 md:grid-cols-3">
                <div className="h-24 rounded-3xl bg-white/10" />
                <div className="h-24 rounded-3xl bg-white/10" />
                <div className="h-24 rounded-3xl bg-white/10" />
              </div>
            </div>
          </section>
        ) : null}

        <header className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur md:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">
                Jungle Gaming Challenge
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
                Crash Game
              </h1>

              <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
                Experiência em tempo real integrada com Kong, Keycloak, Wallets,
                WebSocket, Leaderboard, Auto Cashout e Provably Fair.
              </p>

              {auth.user ? (
                <p className="mt-3 text-sm text-emerald-200">
                  Logado como{" "}
                  <span className="font-semibold">{auth.user.username}</span>
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={`WebSocket: ${socketStatus}`}
                  tone={getSocketTone(socketStatus)}
                />

                <StatusBadge
                  label={getAuthLabel(auth.isAuthenticated, auth.isLoading)}
                  tone={getAuthTone(auth.isAuthenticated, auth.isLoading)}
                />

                <StatusBadge
                  label={round ? getRoundStatusLabel(round.status) : "Rodada"}
                  tone={getRoundTone(round?.status)}
                />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {auth.isAuthenticated ? (
                  <button
                    onClick={() => void handleLogout()}
                    disabled={isLoading}
                    className="rounded-2xl border border-white/10 px-5 py-3 font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Sair
                  </button>
                ) : (
                  <button
                    onClick={handleLogin}
                    disabled={auth.isLoading}
                    className="rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Entrar com Keycloak
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        <RoundHistoryStrip rounds={roundHistory} />

        <section className="grid gap-5 lg:grid-cols-[1.45fr_0.85fr]">
          <div className="flex flex-col gap-5">
            <CrashGraph round={round} />

            <CurrentBetsTable bets={round?.bets ?? []} />
          </div>

          <aside className="flex flex-col gap-5">
            <WalletCard wallet={wallet} player={auth.user} />

            <BettingPanel
              amountReais={amountReais}
              amountCents={amountCents}
              autoCashoutMultiplier={autoCashoutMultiplier}
              canBet={canBet}
              canCashout={canCashout}
              isLoading={isLoading}
              message={dashboardMessage}
              countdownSeconds={countdownSeconds}
              potentialPayoutCents={potentialPayoutCents}
              betDisabledReason={betDisabledReason}
              cashoutDisabledReason={cashoutDisabledReason}
              amountError={amountError}
              onAmountReaisChange={setAmountReais}
              onAutoCashoutMultiplierChange={setAutoCashoutMultiplier}
              onPlaceBet={() => void handlePlaceBet()}
              onCashout={() => void handleCashout()}
            />

            <MyBetCard bet={myLatestBet} profitCents={myBetProfitCents} />
            <ProvablyFairPanel roundId={latestCompletedRoundId} />
            <MyBetsHistoryPanel bets={myBetsHistory} />
            <LeaderboardPanel items={leaderboard} />
          </aside>
        </section>
      </div>
    </main>
  );
}
