import { Activity } from "lucide-react";
import { formatCents } from "@/lib/format";

interface BettingPanelProps {
  amountReais: string;
  amountCents: string;
  autoCashoutMultiplier: string;
  canBet: boolean;
  canCashout: boolean;
  isLoading: boolean;
  message: string;
  countdownSeconds: number | null;
  potentialPayoutCents: string | null;
  betDisabledReason: string | null;
  cashoutDisabledReason: string | null;
  amountError: string | null;
  onAmountReaisChange: (value: string) => void;
  onAutoCashoutMultiplierChange: (value: string) => void;
  onPlaceBet: () => void;
  onCashout: () => void;
}

export function BettingPanel({
  amountReais,
  amountCents,
  autoCashoutMultiplier,
  canBet,
  canCashout,
  isLoading,
  message,
  countdownSeconds,
  potentialPayoutCents,
  betDisabledReason,
  cashoutDisabledReason,
  amountError,
  onAmountReaisChange,
  onAutoCashoutMultiplierChange,
  onPlaceBet,
  onCashout,
}: BettingPanelProps) {
  const cashoutLabel = potentialPayoutCents
    ? `Cashout ${formatCents(potentialPayoutCents)}`
    : "Cashout";

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-sky-400/10 p-3 text-sky-200">
          <Activity size={22} />
        </div>

        <div>
          <h2 className="text-xl font-bold">Controles</h2>
          <p className="text-sm text-slate-400">
            Aposte na fase de apostas e faça cashout durante a rodada.
          </p>
        </div>
      </div>

      <label className="mt-5 block text-sm text-slate-300">
        Valor da aposta em reais
      </label>

      <input
        value={amountReais}
        onChange={(event) => onAmountReaisChange(event.target.value)}
        inputMode="decimal"
        placeholder="10,00"
        className={
          amountError
            ? "mt-2 w-full rounded-2xl border border-red-400/60 bg-slate-950 px-4 py-3 outline-none transition focus:border-red-300"
            : "mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-300"
        }
      />

      <div className="mt-2 flex flex-col gap-1 text-xs">
        <p className="text-slate-500">
          Mínimo: R$ 1,00 · Máximo: R$ 1.000,00 · Enviado como {amountCents}{" "}
          centavos.
        </p>

        {amountError && <p className="text-red-300">{amountError}</p>}
      </div>

      <label className="mt-4 block text-sm text-slate-300">
        Multiplicador do auto cashout
      </label>

      <input
        value={autoCashoutMultiplier}
        onChange={(event) => onAutoCashoutMultiplierChange(event.target.value)}
        inputMode="decimal"
        placeholder="2.00"
        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 outline-none transition focus:border-emerald-300"
      />

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={onPlaceBet}
          disabled={!canBet || isLoading}
          className="rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? "Processando..." : "Apostar"}
        </button>

        <button
          onClick={onCashout}
          disabled={!canCashout || isLoading}
          className="rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? "Processando..." : cashoutLabel}
        </button>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-slate-400">
        {!canBet && betDisabledReason && (
          <p className="rounded-2xl border border-white/10 bg-black/20 p-3">
            Apostar indisponível: {betDisabledReason}
          </p>
        )}

        {!canCashout && cashoutDisabledReason && (
          <p className="rounded-2xl border border-white/10 bg-black/20 p-3">
            Cashout indisponível: {cashoutDisabledReason}
          </p>
        )}
      </div>

      {countdownSeconds !== null && (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-100">
          Janela de apostas fecha em {countdownSeconds}s.
        </div>
      )}

      {potentialPayoutCents && (
        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-sm text-emerald-100">
          Cashout potencial agora: {formatCents(potentialPayoutCents)}
        </div>
      )}

      <p className="mt-4 rounded-2xl bg-black/30 p-3 text-sm text-slate-300">
        {message}
      </p>
    </section>
  );
}
