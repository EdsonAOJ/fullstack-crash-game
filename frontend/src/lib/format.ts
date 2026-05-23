export function formatCents(value: string): string {
  const cents = BigInt(value);
  const reais = Number(cents) / 100;

  return reais.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function reaisToCents(value: string): string {
  const normalized = value
    .replace(/\./g, "")
    .replace(",", ".")
    .trim();

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return "0";
  }

  return Math.round(amount * 100).toString();
}

export function formatMultiplier(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "1.00x";
  }

  return `${value.toFixed(2)}x`;
}

export function getRoundStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    WAITING_FOR_BETS: "Aguardando apostas",
    RUNNING: "Rodada em andamento",
    CRASHED: "Crash",
    COMPLETED: "Concluída",
  };

  return labels[status] ?? status;
}

export function getBetStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_DEBIT: "Aguardando débito",
    ACCEPTED: "Aposta aceita",
    REJECTED: "Rejeitada",
    CASHED_OUT_PENDING_CREDIT: "Cashout pendente",
    CASHED_OUT: "Cashout confirmado",
    LOST: "Perdida",
  };

  return labels[status] ?? status;
}
