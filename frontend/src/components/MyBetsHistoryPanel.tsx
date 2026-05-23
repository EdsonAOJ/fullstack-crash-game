import { History } from "lucide-react";
import type { PlayerBetHistoryItem } from "@/lib/types";
import { formatCents, formatMultiplier, getBetStatusLabel } from "@/lib/format";

interface MyBetsHistoryPanelProps {
  bets?: PlayerBetHistoryItem[];
}

function getStatusColor(status: string): string {
  if (status === "CASHED_OUT") {
    return "text-emerald-300";
  }

  if (status === "LOST" || status === "REJECTED") {
    return "text-red-300";
  }

  if (status === "ACCEPTED" || status === "PENDING_DEBIT") {
    return "text-amber-200";
  }

  return "text-slate-300";
}

export function MyBetsHistoryPanel({ bets = [] }: MyBetsHistoryPanelProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-cyan-400/10 p-3 text-cyan-200">
          <History size={22} />
        </div>

        <div>
          <h2 className="text-xl font-bold">Minhas apostas</h2>
          <p className="text-sm text-slate-400">
            Últimas apostas do jogador autenticado.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {bets.length ? (
          bets.map((bet) => (
            <div
              key={bet.id}
              className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-100">
                    {formatCents(bet.amountCents)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(bet.createdAt).toLocaleString("pt-BR")}
                  </p>
                </div>

                <strong className={`text-right ${getStatusColor(bet.status)}`}>
                  {getBetStatusLabel(bet.status)}
                </strong>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
                <p className="truncate">Rodada: {bet.roundId}</p>

                <p>
                  Auto cashout:{" "}
                  {bet.autoCashoutMultiplier
                    ? formatMultiplier(bet.autoCashoutMultiplier)
                    : "-"}
                </p>

                <p>
                  Cashout:{" "}
                  {bet.cashoutMultiplier
                    ? formatMultiplier(bet.cashoutMultiplier)
                    : "-"}
                </p>

                <p>
                  Payout: {bet.payoutCents ? formatCents(bet.payoutCents) : "-"}
                </p>
              </div>

              {bet.rejectionReason && (
                <p className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-2 text-xs text-red-200">
                  Motivo: {bet.rejectionReason}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
            Nenhuma aposta encontrada ainda.
          </p>
        )}
      </div>
    </section>
  );
}
