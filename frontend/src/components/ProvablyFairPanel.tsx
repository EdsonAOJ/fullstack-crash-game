import { useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { getRoundVerification } from "@/lib/api";
import { formatMultiplier } from "@/lib/format";
import type { RoundVerification } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";

interface ProvablyFairPanelProps {
  roundId?: string;
}

function shortHash(value?: string): string {
  if (!value) {
    return "-";
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

export function ProvablyFairPanel({ roundId }: ProvablyFairPanelProps) {
  const [verification, setVerification] = useState<RoundVerification | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleVerify(): Promise<void> {
    if (!roundId) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await getRoundVerification(roundId);
      setVerification(data);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Erro ao verificar rodada.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  const isValid =
    verification?.isHashValid === true &&
    verification?.isCrashPointValid === true;

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-400/10 p-3 text-emerald-200">
          <ShieldCheck size={22} />
        </div>

        <div>
          <h2 className="text-xl font-bold">Provably Fair</h2>
          <p className="text-sm text-slate-400">
            Verifique se o crash point foi calculado corretamente.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs text-slate-500">Rodada selecionada</p>
        <p className="mt-1 truncate text-sm text-slate-300">
          {roundId ?? "Nenhuma rodada finalizada disponível"}
        </p>
      </div>

      <button
        onClick={() => void handleVerify()}
        disabled={!roundId || isLoading}
        className="mt-4 w-full rounded-2xl bg-sky-300 px-4 py-3 font-semibold text-slate-950 transition hover:bg-sky-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {isLoading ? "Verificando..." : "Verificar última rodada"}
      </button>

      {errorMessage && (
        <p className="mt-3 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">
          {errorMessage}
        </p>
      )}

      {verification && (
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              label={verification.isRevealed ? "Seed revelada" : "Seed oculta"}
              tone={verification.isRevealed ? "green" : "yellow"}
            />

            <StatusBadge
              label={isValid ? "Verificação válida" : "Aguardando validação"}
              tone={isValid ? "green" : "neutral"}
            />
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl bg-black/20 p-3">
              <p className="text-xs text-slate-500">Algoritmo</p>
              <p className="font-medium">{verification.algorithm}</p>
            </div>

            <div className="rounded-2xl bg-black/20 p-3">
              <p className="text-xs text-slate-500">Server seed hash</p>
              <p className="break-all font-mono text-xs">
                {shortHash(verification.serverSeedHash)}
              </p>
            </div>

            <div className="rounded-2xl bg-black/20 p-3">
              <p className="text-xs text-slate-500">Public seed</p>
              <p className="font-mono text-xs">{verification.publicSeed}</p>
            </div>

            <div className="rounded-2xl bg-black/20 p-3">
              <p className="text-xs text-slate-500">Nonce</p>
              <p>{verification.nonce}</p>
            </div>

            {verification.serverSeed && (
              <div className="rounded-2xl bg-black/20 p-3">
                <p className="text-xs text-slate-500">Server seed</p>
                <p className="break-all font-mono text-xs">
                  {shortHash(verification.serverSeed)}
                </p>
              </div>
            )}

            {verification.crashPoint && (
              <div className="rounded-2xl bg-emerald-400/10 p-3">
                <p className="text-xs text-emerald-100/70">Crash point</p>
                <p className="text-lg font-bold text-emerald-200">
                  {formatMultiplier(verification.crashPoint)}
                </p>
              </div>
            )}

            {verification.calculatedCrashPoint && (
              <div className="rounded-2xl bg-sky-400/10 p-3">
                <p className="text-xs text-sky-100/70">
                  Crash point recalculado
                </p>
                <p className="text-lg font-bold text-sky-200">
                  {formatMultiplier(verification.calculatedCrashPoint)}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-400">
            <LockKeyhole size={16} className="mt-0.5 shrink-0" />
            <p>
              Antes da rodada finalizar, apenas o hash da seed fica visível.
              Após o crash, a seed é revelada e o jogador pode validar se o
              resultado bate com o cálculo esperado.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
