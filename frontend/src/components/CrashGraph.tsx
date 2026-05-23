import type { CurrentRound } from "@/lib/types";
import { formatMultiplier, getRoundStatusLabel } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";

interface CrashGraphProps {
  round: CurrentRound | null;
}

function getTone(status?: string): "green" | "red" | "yellow" | "neutral" {
  if (status === "RUNNING") return "green";
  if (status === "CRASHED") return "red";
  if (status === "WAITING_FOR_BETS") return "yellow";
  return "neutral";
}

export function CrashGraph({ round }: CrashGraphProps) {
  const multiplier = round?.currentMultiplier ?? 1;
  const status = round?.status ?? "LOADING";
  const progress = Math.min(Math.max((multiplier - 1) / 8, 0), 1);
  const endX = 70 + progress * 220;
  const endY = 260 - progress * 190;

  const strokeClass =
    status === "CRASHED"
      ? "stroke-red-400"
      : status === "RUNNING"
        ? "stroke-emerald-300"
        : "stroke-amber-300";

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.18),transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),transparent_35%)]" />

      <div className="relative z-10 flex flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">
              Crash Round
            </p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">
              {round ? getRoundStatusLabel(round.status) : "Carregando rodada"}
            </h2>
            <p className="mt-2 max-w-xl truncate text-xs text-slate-500">
              {round?.id ?? "Aguardando dados da rodada atual"}
            </p>
          </div>

          <StatusBadge
            label={round ? getRoundStatusLabel(round.status) : "Carregando"}
            tone={getTone(round?.status)}
          />
        </div>

        <div className="relative min-h-[320px] rounded-3xl border border-white/10 bg-black/30 p-4">
          <svg
            viewBox="0 0 360 280"
            className="absolute inset-0 h-full w-full opacity-90"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="crash-gradient" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="rgba(16,185,129,0.05)" />
                <stop offset="100%" stopColor="rgba(16,185,129,0.45)" />
              </linearGradient>
            </defs>

            {Array.from({ length: 8 }).map((_, index) => (
              <line
                key={`h-${index}`}
                x1="20"
                x2="340"
                y1={35 + index * 32}
                y2={35 + index * 32}
                className="stroke-white/5"
              />
            ))}

            {Array.from({ length: 7 }).map((_, index) => (
              <line
                key={`v-${index}`}
                x1={40 + index * 48}
                x2={40 + index * 48}
                y1="20"
                y2="260"
                className="stroke-white/5"
              />
            ))}

            <path
              d={`M 35 250 C 95 245, ${endX - 80} ${endY + 60}, ${endX} ${endY}`}
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              className={`${strokeClass} drop-shadow-[0_0_12px_rgba(52,211,153,0.8)] transition-all duration-300`}
            />

            <circle
              cx={endX}
              cy={endY}
              r="7"
              className={
                status === "CRASHED"
                  ? "fill-red-300"
                  : "fill-emerald-300"
              }
            />
          </svg>

          <div className="relative z-10 flex h-[300px] flex-col items-center justify-center text-center">
            <p
              className={
                status === "CRASHED"
                  ? "text-7xl font-black text-red-300 md:text-8xl"
                  : "text-7xl font-black text-emerald-300 md:text-8xl"
              }
            >
              {formatMultiplier(multiplier)}
            </p>

            <p className="mt-3 text-sm text-slate-400">
              {status === "WAITING_FOR_BETS"
                ? "Prepare sua aposta antes da rodada começar."
                : status === "RUNNING"
                  ? "Multiplicador subindo. Faça cashout antes do crash."
                  : status === "CRASHED"
                    ? "A rodada crashou."
                    : "Aguardando próxima rodada."}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs text-slate-500">Início previsto</p>
            <p className="mt-1 text-sm">
              {round?.startsAt
                ? new Date(round.startsAt).toLocaleTimeString("pt-BR")
                : "-"}
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs text-slate-500">Crash point</p>
            <p className="mt-1 text-sm">
              {round?.crashPoint ? formatMultiplier(round.crashPoint) : "Oculto"}
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs text-slate-500">Seed hash</p>
            <p className="mt-1 truncate text-xs text-slate-300">
              {round?.serverSeedHash ?? "-"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
