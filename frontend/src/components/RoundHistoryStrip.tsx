import type { RoundHistoryItem } from "@/lib/types";
import { formatMultiplier } from "@/lib/format";

interface RoundHistoryStripProps {
  rounds: RoundHistoryItem[];
}

function getCrashClass(crashPoint: number): string {
  if (crashPoint < 1.5) {
    return "border-red-400/40 bg-red-400/10 text-red-200";
  }

  if (crashPoint < 2) {
    return "border-amber-300/40 bg-amber-300/10 text-amber-100";
  }

  return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
}

export function RoundHistoryStrip({ rounds }: RoundHistoryStripProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Histórico de rodadas</h2>
          <p className="text-sm text-slate-400">
            Últimos crash points finalizados
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {rounds.length ? (
            rounds.map((round) => (
              <span
                key={round.id}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${getCrashClass(
                  round.crashPoint,
                )}`}
              >
                {formatMultiplier(round.crashPoint)}
              </span>
            ))
          ) : (
            <span className="text-sm text-slate-500">
              Sem histórico disponível ainda.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
