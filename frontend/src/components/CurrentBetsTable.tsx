import type { RoundBet } from "@/lib/types";
import { formatCents, formatMultiplier, getBetStatusLabel } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

interface CurrentBetsTableProps {
  bets: RoundBet[];
}

export function CurrentBetsTable({ bets }: CurrentBetsTableProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-5 shadow-2xl">
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Apostas da rodada atual</h2>
          <p className="text-sm text-slate-400">
            Atualizadas por WebSocket e sincronização periódica.
          </p>
        </div>

        <StatusBadge label={`${bets.length} apostas`} tone="blue" />
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {bets.length ? (
          bets.map((bet) => (
            <div
              key={bet.id}
              className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm md:grid-cols-[1fr_1fr_1.6fr_1fr]"
            >
              <div>
                <p className="text-xs text-slate-500">Player</p>
                <p className="font-semibold text-slate-100">{bet.playerId}</p>
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
                <p className="font-semibold text-emerald-300">
                  {bet.cashoutMultiplier
                    ? formatMultiplier(bet.cashoutMultiplier)
                    : "-"}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-center text-sm text-slate-400">
            Nenhuma aposta registrada nesta rodada.
          </div>
        )}
      </div>
    </section>
  );
}
