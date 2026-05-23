interface StatusBadgeProps {
  label: string;
  tone?: "green" | "red" | "yellow" | "blue" | "neutral";
}

const toneClasses: Record<NonNullable<StatusBadgeProps["tone"]>, string> = {
  green: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
  red: "border-red-400/40 bg-red-400/10 text-red-200",
  yellow: "border-amber-300/40 bg-amber-300/10 text-amber-100",
  blue: "border-sky-300/40 bg-sky-300/10 text-sky-100",
  neutral: "border-white/10 bg-white/5 text-slate-300",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
