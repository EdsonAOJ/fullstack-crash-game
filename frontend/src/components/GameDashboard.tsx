"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import {
  cashoutBet,
  getAccessToken,
  getCurrentRound,
  getLeaderboard,
  getMyBets,
  getRoundHistory,
  getWallet,
  placeBet,
} from "@/lib/api";
import {
  formatCents,
  formatMultiplier,
  getBetStatusLabel,
  getRoundStatusLabel,
  reaisToCents,
} from "@/lib/format";
import type {
  CurrentRound,
  LeaderboardItem,
  PlayerBetHistoryItem,
  RoundHistoryItem,
  Wallet,
} from "@/lib/types";
import {
  applyRealtimeBet,
  applyRealtimeRound,
  connectGameSocket,
} from "@/lib/game-socket";
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

function getAuthTone(status: string): "green" | "red" | "yellow" | "neutral" {
  if (status === "Autenticado") return "green";
  if (status === "Falha na autenticação") return "red";
  if (status === "Autenticando...") return "yellow";

  return "neutral";
}

function getRoundTone(status?: string): "green" | "red" | "yellow" | "neutral" {
  if (status === "RUNNING") return "green";
  if (status === "CRASHED") return "red";
  if (status === "WAITING_FOR_BETS") return "yellow";

  return "neutral";
}

export function GameDashboard() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [round, setRound] = useState<CurrentRound | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([]);
  const [myBetsHistory, setMyBetsHistory] = useState<PlayerBetHistoryItem[]>(
    [],
  );
  const [amountReais, setAmountReais] = useState("10");
  const [autoCashoutMultiplier, setAutoCashoutMultiplier] = useState("2.00");
  const [message, setMessage] = useState<string>("Inicializando...");
  const [isLoading, setIsLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState("Desconectado");
  const [authStatus, setAuthStatus] = useState("Não autenticado");
  const [nowMs, setNowMs] = useState(0);

  const hasBootstrappedRef = useRef(false);

  const amountCents = useMemo(() => reaisToCents(amountReais), [amountReais]);

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
    Boolean(accessToken) &&
    Boolean(wallet) &&
    round?.status === "WAITING_FOR_BETS" &&
    !myLatestBet?.status?.match(
      /PENDING_DEBIT|ACCEPTED|CASHED_OUT_PENDING_CREDIT|CASHED_OUT/,
    ) &&
    amountError === null;

  const canCashout =
    Boolean(accessToken) &&
    Boolean(wallet) &&
    round?.status === "RUNNING" &&
    Boolean(myAcceptedBet);

  const betDisabledReason = useMemo(() => {
    if (!accessToken) return "usuário não autenticado";
    if (!wallet) return "carteira ainda não carregada";
    if (amountError) return amountError;
    if (round?.status !== "WAITING_FOR_BETS") return "fora da fase de apostas";

    if (
      myLatestBet?.status === "PENDING_DEBIT" ||
      myLatestBet?.status === "ACCEPTED" ||
      myLatestBet?.status === "CASHED_OUT_PENDING_CREDIT" ||
      myLatestBet?.status === "CASHED_OUT"
    ) {
      return "você já possui uma aposta ativa ou liquidada nesta rodada";
    }

    return null;
  }, [accessToken, amountError, myLatestBet, round?.status, wallet]);

  const cashoutDisabledReason = useMemo(() => {
    if (!accessToken) return "usuário não autenticado";
    if (!wallet) return "carteira ainda não carregada";
    if (round?.status !== "RUNNING") return "rodada não está em andamento";
    if (!myAcceptedBet) return "não existe aposta ativa para sacar";

    return null;
  }, [accessToken, myAcceptedBet, round?.status, wallet]);

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

  const latestCompletedRoundId = roundHistory[0]?.id;

  const refresh = useCallback(async (token?: string | null): Promise<void> => {
    const currentRoundResult = await getCurrentRound()
      .then((data) => ({ ok: true as const, data }))
      .catch((error) => ({ ok: false as const, error }));

    const leaderboardResult = await getLeaderboard()
      .then((data) => ({ ok: true as const, data }))
      .catch((error) => ({ ok: false as const, error }));

    const historyResult = await getRoundHistory()
      .then((data) => ({ ok: true as const, data }))
      .catch((error) => ({ ok: false as const, error }));

    const walletResult = token
      ? await getWallet(token)
          .then((data) => ({ ok: true as const, data }))
          .catch((error) => ({ ok: false as const, error }))
      : null;

    const myBetsResult = token
      ? await getMyBets(token)
          .then((data) => ({ ok: true as const, data }))
          .catch((error) => ({ ok: false as const, error }))
      : null;

    if (currentRoundResult.ok) {
      setRound(currentRoundResult.data);
    }

    if (leaderboardResult.ok) {
      setLeaderboard(leaderboardResult.data.items);
    }

    if (historyResult.ok) {
      setRoundHistory(historyResult.data.items);
    }

    if (walletResult?.ok) {
      setWallet(walletResult.data);
    }

    if (myBetsResult?.ok) {
      setMyBetsHistory(myBetsResult.data.items ?? []);
    }

    const errors = [
      currentRoundResult.ok ? null : "rodada atual",
      leaderboardResult.ok ? null : "leaderboard",
      historyResult.ok ? null : "histórico",
      token && walletResult && !walletResult.ok ? "carteira" : null,
      token && myBetsResult && !myBetsResult.ok ? "minhas apostas" : null,
      !token ? "autenticação/carteira" : null,
    ].filter(Boolean);

    if (errors.length > 0) {
      const nextMessage = `Ainda não foi possível carregar: ${errors.join(", ")}.`;
      setMessage(nextMessage);
      return;
    }

    setMessage("Dados atualizados.");
  }, []);

  const bootstrap = useCallback(async (): Promise<void> => {
    try {
      setAuthStatus("Autenticando...");

      const token = await getAccessToken();

      setAccessToken(token);
      setAuthStatus("Autenticado");
      setMessage("Autenticado como player.");

      await refresh(token);

      toast.success("Autenticado com sucesso.");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao autenticar.";

      setAccessToken(null);
      setAuthStatus("Falha na autenticação");
      setMessage(errorMessage);

      toast.error(errorMessage);
    }
  }, [refresh]);

  useEffect(() => {
    if (hasBootstrappedRef.current) {
      return;
    }

    hasBootstrappedRef.current = true;

    const timeoutId = window.setTimeout(() => {
      setIsLoading(true);

      void bootstrap().finally(() => {
        setIsLoading(false);
      });
    }, 100);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bootstrap]);

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
    const intervalId = window.setInterval(() => {
      void refresh(accessToken);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [accessToken, refresh]);

  useEffect(() => {
    const socket = connectGameSocket({
      onReady: () => {
        setSocketStatus("Conectado");
      },
      onRound: (payload) => {
        setRound((currentRound) => applyRealtimeRound(currentRound, payload));
      },
      onBet: (payload) => {
        setRound((currentRound) => applyRealtimeBet(currentRound, payload));
      },
      onDisconnect: () => {
        setSocketStatus("Desconectado");
      },
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  async function authenticate(): Promise<void> {
    setIsLoading(true);

    try {
      await bootstrap();
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePlaceBet(): Promise<void> {
    if (!accessToken) {
      toast.error("Autentique antes de apostar.");
      setMessage("Autentique antes de apostar.");
      return;
    }

    if (amountError) {
      toast.error(amountError);
      setMessage(amountError);
      return;
    }

    setIsLoading(true);

    try {
      const parsedAutoCashout = autoCashoutMultiplier
        ? Number(autoCashoutMultiplier.replace(",", "."))
        : undefined;

      const bet = await placeBet({
        accessToken,
        amountCents,
        autoCashoutMultiplier: Number.isFinite(parsedAutoCashout)
          ? parsedAutoCashout
          : undefined,
      });

      const nextMessage = `Aposta criada com status ${getBetStatusLabel(
        bet.status,
      )}.`;

      setMessage(nextMessage);
      toast.success(nextMessage);

      await refresh(accessToken);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro ao apostar.";

      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCashout(): Promise<void> {
    if (!accessToken) {
      toast.error("Autentique antes de sacar.");
      setMessage("Autentique antes de sacar.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await cashoutBet(accessToken);

      const nextMessage = `Cashout solicitado em ${formatMultiplier(
        result.cashoutMultiplier,
      )}. Payout: ${formatCents(result.payoutCents)}.`;

      setMessage(nextMessage);
      toast.success(nextMessage);

      await refresh(accessToken);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro no cashout.";

      setMessage(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] px-4 py-5 text-slate-100 md:px-8">
      <Toaster richColors position="top-right" />

      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,_rgba(59,130,246,0.14),transparent_30%),linear-gradient(180deg,_rgba(15,23,42,0),rgba(2,6,23,0.92))]" />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-5">
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
            </div>

            <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={`WebSocket: ${socketStatus}`}
                  tone={getSocketTone(socketStatus)}
                />

                <StatusBadge
                  label={`Auth: ${authStatus}`}
                  tone={getAuthTone(authStatus)}
                />

                <StatusBadge
                  label={round ? getRoundStatusLabel(round.status) : "Rodada"}
                  tone={getRoundTone(round?.status)}
                />
              </div>

              <button
                onClick={() => void authenticate()}
                disabled={isLoading}
                className="rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {accessToken ? "Reautenticar" : "Autenticar"}
              </button>
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
            <WalletCard wallet={wallet} />

            <BettingPanel
              amountReais={amountReais}
              amountCents={amountCents}
              autoCashoutMultiplier={autoCashoutMultiplier}
              canBet={canBet}
              canCashout={canCashout}
              isLoading={isLoading}
              message={message}
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
