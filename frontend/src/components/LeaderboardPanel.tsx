import type { LeaderboardItem } from "@/lib/types";
import { formatCents } from "@/lib/format";

interface LeaderboardPanelProps {
  items: LeaderboardItem[];
}

export function LeaderboardPanel({ items }: LeaderboardPanelProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
      <h2 className="text-xl font-bold">Leaderboard</h2>
      <p className="text-sm text-slate-400">Ranking por lucro acumulado.</p>

      <div className="mt-4 flex flex-col gap-3">
        {items.length ? (
          items.map((item, index) => (
            <div
              key={item.playerId}
              className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm"
            >
              <div className="flex items-center justify-between gap-4">
                <strong>
                  #{index + 1} {item.playerId}
                </strong>

                <span
                  className={
                    BigInt(item.totalProfitCents) >= BigInt(0)
                      ? "text-emerald-300"
                      : "text-red-300"
                  }
                >
                  {formatCents(item.totalProfitCents)}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                Bets: {item.betsCount} · Cashouts: {item.cashoutsCount} · Lost:{" "}
                {item.lostBetsCount}
              </p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-slate-400">
            Sem dados finalizados ainda.
          </p>
        )}
      </div>
    </section>
  );
}
