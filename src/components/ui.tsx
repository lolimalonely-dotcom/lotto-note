import { TYPE_LABEL, TYPE_TONE } from "@/lib/rules";
import { fmt } from "@/lib/summary";
import type { EntryType } from "@/lib/types";

export const card = "rounded-xl border border-line bg-surface";

export const btn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium transition hover:bg-surface-2 active:scale-[.98] disabled:pointer-events-none disabled:opacity-40";

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-accent px-3 py-2 text-sm font-semibold text-accent-fg transition hover:opacity-90 active:scale-[.98] disabled:pointer-events-none disabled:opacity-40";

export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition hover:bg-surface-2 hover:text-foreground";

export const input =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25";

export function TypeBadge({ type, className = "" }: { type: EntryType; className?: string }) {
  return (
    <span
      className={`inline-flex min-w-11 items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold ${TYPE_TONE[type]} ${className}`}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{fmt.format(value)}</span>;
}

export function Stat({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`${card} px-4 py-3`}>
      <div className="text-xs text-muted">{label}</div>
      <div
        className={`mt-0.5 text-2xl font-bold tabular-nums ${accent ? "text-accent" : ""}`}
      >
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center text-sm text-muted">
      {children}
    </div>
  );
}
