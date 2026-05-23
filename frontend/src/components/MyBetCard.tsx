import { ShieldCheck } from "lucide-react";
import type { RoundBet } from "@/lib/types";
import { formatCents, formatMultiplier, getBetStatusLabel } from "@/lib/format";

interface MyBetCardProps {
  bet: RoundBet | null;
  profitCents: string | null;
}

export function MyBetCard({ bet, profitCents }: MyBetCardProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-violet-400/10 p-3 text-violet-200">
          <ShieldCheck size={22} />
        </div>

        <div>
          <h2 className="text-xl font-bold">Minha aposta</h2>
          <p className="text-sm text-slate-400">
            Status da sua aposta na rodada atual.
          </p>
        </div>
      </div>

      {bet ? (
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div className="flex justify-between gap-4">
            <span>Status</span>
            <strong className="text-right text-slate-100">
              {getBetStatusLabel(bet.status)}
            </strong>
          </div>

          <div className="flex justify-between gap-4">
            <span>Valor apostado</span>
            <strong className="text-slate-100">{formatCents(bet.amountCents)}</strong>
          </div>

          {bet.cashoutMultiplier && (
            <div className="flex justify-between gap-4">
              <span>Multiplicador</span>
              <strong className="text-emerald-300">
                {formatMultiplier(bet.cashoutMultiplier)}
              </strong>
            </div>
          )}

          {bet.payoutCents && (
            <div className="flex justify-between gap-4">
              <span>Payout</span>
              <strong className="text-emerald-300">
                {formatCents(bet.payoutCents)}
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
      ) : (
        <p className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
          Nenhuma aposta sua na rodada atual.
        </p>
      )}
    </section>
  );
}
