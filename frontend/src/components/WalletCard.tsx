import { BadgeDollarSign, UserCircle } from "lucide-react";
import type { AuthenticatedUser } from "@/providers/AuthProvider";
import type { Wallet } from "@/lib/types";
import { formatCents } from "@/lib/format";

interface WalletCardProps {
  wallet: Wallet | null;
  player: AuthenticatedUser | null;
}

export function WalletCard({ wallet, player }: WalletCardProps) {
  return (
    <section className="rounded-[2rem] border border-emerald-300/20 bg-emerald-300/10 p-5 shadow-2xl">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-emerald-300/20 p-3 text-emerald-200">
          <BadgeDollarSign size={24} />
        </div>

        <div>
          <p className="text-sm text-emerald-100/80">Carteira</p>
          <h2 className="mt-1 text-3xl font-black">
            {wallet ? formatCents(wallet.balanceCents) : "Carregando..."}
          </h2>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-200/10 bg-slate-950/30 p-3">
        <div className="flex items-center gap-2 text-emerald-100">
          <UserCircle size={18} />
          <span className="text-sm font-semibold">
            {player?.username ?? wallet?.playerId ?? "player"}
          </span>
        </div>

        {player?.email ? (
          <p className="mt-1 text-xs text-emerald-100/60">{player.email}</p>
        ) : null}

        <p className="mt-2 text-xs text-emerald-100/50">
          Player ID: {wallet?.playerId ?? "carregando"}
        </p>
      </div>
    </section>
  );
}
