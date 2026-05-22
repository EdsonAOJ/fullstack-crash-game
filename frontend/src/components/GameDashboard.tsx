"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  cashoutBet,
  getAccessToken,
  getCurrentRound,
  getLeaderboard,
  getWallet,
  placeBet,
} from "@/lib/api";
import type { CurrentRound, LeaderboardItem, Wallet } from "@/lib/types";
import {
  applyRealtimeBet,
  applyRealtimeRound,
  connectGameSocket,
} from "@/lib/game-socket";

function formatCents(value: string): string {
  const cents = BigInt(value);
  const reais = Number(cents) / 100;

  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    WAITING_FOR_BETS: "Aguardando apostas",
    RUNNING: "Rodada em andamento",
    CRASHED: "Crash",
    COMPLETED: "Concluída",
  };

  return labels[status] ?? status;
}

export function GameDashboard() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [round, setRound] = useState<CurrentRound | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [amountCents, setAmountCents] = useState("1000");
  const [autoCashoutMultiplier, setAutoCashoutMultiplier] = useState("1.5");
  const [message, setMessage] = useState<string>("Inicializando...");
  const [isLoading, setIsLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState("Desconectado");
  const [authStatus, setAuthStatus] = useState("Não autenticado");
  const hasBootstrappedRef = useRef(false);

  const canBet = round?.status === "WAITING_FOR_BETS";
  const myAcceptedBet = round?.bets.find(
    (bet) => bet.playerId === wallet?.playerId && bet.status === "ACCEPTED",
  );

  const canCashout = round?.status === "RUNNING" && Boolean(myAcceptedBet);

  const currentMultiplierLabel = useMemo(() => {
    if (!round) {
      return "1.00x";
    }

    return `${round.currentMultiplier.toFixed(2)}x`;
  }, [round]);

  const refresh = useCallback(async (token?: string | null): Promise<void> => {
    const currentRoundResult = await getCurrentRound()
      .then((data) => ({ ok: true as const, data }))
      .catch((error) => ({ ok: false as const, error }));

    const leaderboardResult = await getLeaderboard()
      .then((data) => ({ ok: true as const, data }))
      .catch((error) => ({ ok: false as const, error }));

    const walletResult = token
      ? await getWallet(token)
          .then((data) => ({ ok: true as const, data }))
          .catch((error) => ({ ok: false as const, error }))
      : null;

    if (currentRoundResult.ok) {
      setRound(currentRoundResult.data);
    }

    if (leaderboardResult.ok) {
      setLeaderboard(leaderboardResult.data.items);
    }

    if (walletResult?.ok) {
      setWallet(walletResult.data);
    }

    const errors = [
      currentRoundResult.ok ? null : "rodada atual",
      leaderboardResult.ok ? null : "leaderboard",
      token && walletResult && !walletResult.ok ? "carteira" : null,
      !token ? "autenticação/carteira" : null,
    ].filter(Boolean);

    if (errors.length > 0) {
      setMessage(`Ainda não foi possível carregar: ${errors.join(", ")}.`);
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
    } catch (error) {
      setAccessToken(null);
      setAuthStatus("Falha na autenticação");
      setMessage(
        error instanceof Error ? error.message : "Erro ao autenticar.",
      );
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
      setMessage("Autentique antes de apostar.");
      return;
    }

    setIsLoading(true);

    try {
      const parsedAutoCashout = autoCashoutMultiplier
        ? Number(autoCashoutMultiplier)
        : undefined;

      const bet = await placeBet({
        accessToken,
        amountCents,
        autoCashoutMultiplier: Number.isFinite(parsedAutoCashout)
          ? parsedAutoCashout
          : undefined,
      });

      setMessage(`Aposta criada com status ${bet.status}.`);
      await refresh(accessToken);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao apostar.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCashout(): Promise<void> {
    if (!accessToken) {
      setMessage("Autentique antes de sacar.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await cashoutBet(accessToken);
      setMessage(
        `Cashout solicitado em ${result.cashoutMultiplier.toFixed(2)}x.`,
      );
      await refresh(accessToken);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro no cashout.");
    } finally {
      setIsLoading(false);
    }
  }

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

  function getBetStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING_DEBIT: "Aguardando débito",
      ACCEPTED: "Aposta aceita",
      REJECTED: "Rejeitada",
      CASHED_OUT_PENDING_CREDIT: "Cashout pendente",
      CASHED_OUT: "Cashout confirmado",
      LOST: "Perdida",
    };

    return labels[status] ?? status;
  }
  return (
    <main className="min-h-screen bg-[#050816] px-4 py-6 text-slate-100 md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-300">
            Jungle Gaming Challenge
          </p>
          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-4xl font-bold md:text-6xl">Crash Game</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
                Frontend integrado ao backend com Kong, Keycloak, Wallets,
                Leaderboard, Auto Cashout e rodada atual.
              </p>
            </div>

            <button
              onClick={() => void authenticate()}
              disabled={isLoading}
              className="rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-60"
            >
              {accessToken ? "Reautenticar" : "Autenticar"}
            </button>

            <p className="mt-2 text-xs text-slate-400">
              WebSocket: {socketStatus}
            </p>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm text-slate-400">Rodada atual</p>
                <h2 className="mt-1 text-2xl font-semibold">
                  {round ? getStatusLabel(round.status) : "Carregando..."}
                </h2>
                <p className="mt-2 text-xs text-slate-500">
                  {round?.id ?? "Sem rodada carregada"}
                </p>
              </div>

              <div className="rounded-3xl bg-emerald-400/10 px-8 py-6 text-center">
                <p className="text-sm text-emerald-200">Multiplicador</p>
                <p className="mt-1 text-6xl font-black text-emerald-300">
                  {currentMultiplierLabel}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Início previsto</p>
                <p className="mt-1 text-sm">
                  {round?.startsAt
                    ? new Date(round.startsAt).toLocaleTimeString("pt-BR")
                    : "-"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Crash point</p>
                <p className="mt-1 text-sm">
                  {round?.crashPoint
                    ? `${round.crashPoint.toFixed(2)}x`
                    : "Oculto"}
                </p>
              </div>

              <div className="rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-slate-400">Seed hash</p>
                <p className="mt-1 truncate text-xs text-slate-300">
                  {round?.serverSeedHash ?? "-"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <h3 className="font-semibold">Apostas da rodada</h3>

              <div className="mt-3 flex flex-col gap-2">
                {round?.bets.length ? (
                  round.bets.map((bet) => (
                    <div
                      key={bet.id}
                      className="grid gap-3 rounded-xl bg-white/5 p-3 text-sm md:grid-cols-[1fr_1fr_1.6fr_1fr]"
                    >
                      <div>
                        <p className="text-xs text-slate-500">Player</p>
                        <p className="font-medium">{bet.playerId}</p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Valor</p>
                        <p>{formatCents(bet.amountCents)}</p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Status</p>
                        <p className="break-words font-medium">
                          {getBetStatusLabel(bet.status)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">Cashout</p>
                        <p>
                          {bet.cashoutMultiplier
                            ? `${bet.cashoutMultiplier.toFixed(2)}x`
                            : "-"}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">
                    Nenhuma aposta nesta rodada.
                  </p>
                )}
              </div>
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-slate-400">Carteira</p>
              <h2 className="mt-2 text-3xl font-bold">
                {wallet ? formatCents(wallet.balanceCents) : "Carregando..."}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Player: {wallet?.playerId ?? "player"}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Controles</h2>

              <label className="mt-4 block text-sm text-slate-300">
                Valor da aposta em centavos
              </label>
              <input
                value={amountCents}
                onChange={(event) => setAmountCents(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-300"
              />

              <label className="mt-4 block text-sm text-slate-300">
                Multiplicador do auto cashout
              </label>
              <input
                value={autoCashoutMultiplier}
                onChange={(event) =>
                  setAutoCashoutMultiplier(event.target.value)
                }
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-300"
              />

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  onClick={() => void handlePlaceBet()}
                  disabled={!canBet || isLoading}
                  className="rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apostar
                </button>

                <button
                  onClick={() => void handleCashout()}
                  disabled={!canCashout || isLoading}
                  className="rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Cashout
                </button>
              </div>

              <p className="mt-4 rounded-2xl bg-black/30 p-3 text-sm text-slate-300">
                {message}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-semibold">Minha aposta</h2>

              {myAcceptedBet ||
              round?.bets.find((bet) => bet.playerId === wallet?.playerId) ? (
                (() => {
                  const myBet = round?.bets.find(
                    (bet) => bet.playerId === wallet?.playerId,
                  );

                  if (!myBet) {
                    return null;
                  }

                  const profitCents =
                    myBet.payoutCents !== undefined
                      ? (
                          BigInt(myBet.payoutCents) - BigInt(myBet.amountCents)
                        ).toString()
                      : undefined;

                  return (
                    <div className="mt-4 space-y-3 text-sm text-slate-300">
                      <div className="flex justify-between gap-4">
                        <span>Status</span>
                        <strong className="text-right text-slate-100">
                          {getBetStatusLabel(myBet.status)}
                        </strong>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span>Valor apostado</span>
                        <strong className="text-slate-100">
                          {formatCents(myBet.amountCents)}
                        </strong>
                      </div>

                      {myBet.cashoutMultiplier && (
                        <div className="flex justify-between gap-4">
                          <span>Multiplicador</span>
                          <strong className="text-emerald-300">
                            {myBet.cashoutMultiplier.toFixed(2)}x
                          </strong>
                        </div>
                      )}

                      {myBet.payoutCents && (
                        <div className="flex justify-between gap-4">
                          <span>Payout</span>
                          <strong className="text-emerald-300">
                            {formatCents(myBet.payoutCents)}
                          </strong>
                        </div>
                      )}

                      {profitCents && (
                        <div className="flex justify-between gap-4">
                          <span>Lucro líquido</span>
                          <strong
                            className={
                              BigInt(profitCents) >= BigInt(0)
                                ? "text-emerald-300"
                                : "text-red-300"
                            }
                          >
                            {formatCents(profitCents)}
                          </strong>
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <p className="mt-3 text-sm text-slate-400">
                  Nenhuma aposta sua na rodada atual.
                </p>
              )}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
