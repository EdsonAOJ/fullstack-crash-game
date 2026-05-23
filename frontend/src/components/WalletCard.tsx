import { BadgeDollarSign } from "lucide-react";
import type { Wallet } from "@/lib/types";
import { formatCents } from "@/lib/format";

interface WalletCardProps {
  wallet: Wallet | null;
}

export function WalletCard({ wallet }: WalletCardProps) {
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

      <p className="mt-3 text-xs text-emerald-100/70">
        Player: {wallet?.playerId ?? "player"}
      </p>
    </section>
  );
}
