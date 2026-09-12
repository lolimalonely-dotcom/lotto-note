import { TYPE_LABEL, TYPE_TONE } from "@/lib/rules";
import { fmt } from "@/lib/summary";
import type { EntryType } from "@/lib/types";

export const card = "rounded-2xl border border-line bg-surface";

/** ปุ่มทุกตัวสูงอย่างน้อย 48px เพื่อให้จิ้มง่ายทั้งบนมือถือและเมาส์ */
export const btn =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-line bg-surface px-4 text-base font-semibold transition hover:bg-surface-2 active:scale-[.98] disabled:pointer-events-none disabled:opacity-40";

export const btnPrimary =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-transparent bg-accent px-4 text-base font-bold text-accent-fg transition hover:opacity-90 active:scale-[.98] disabled:pointer-events-none disabled:opacity-40";

export const btnQuiet =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-base text-muted transition hover:bg-surface-2 hover:text-foreground";

export const input =
  "w-full rounded-xl border-2 border-line bg-surface px-4 py-3 text-lg outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/20";

/** ช่องกรอกตัวเลข ตัวใหญ่พิเศษ */
export const numInput = `${input} keypad-input h-16 text-center text-3xl font-bold`;

export const label = "mb-2 block text-base font-semibold text-muted";

export function TypeBadge({ type, big = false }: { type: EntryType; big?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg font-bold ${TYPE_TONE[type]} ${
        big ? "min-w-16 px-2.5 py-1 text-lg" : "min-w-14 px-2 py-1 text-base"
      }`}
    >
      {TYPE_LABEL[type]}
    </span>
  );
}

export function Money({ value, className = "" }: { value: number; className?: string }) {
  return <span className={`tabular-nums ${className}`}>{fmt.format(value)}</span>;
}

export function Stat({
  label: text,
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
      <div className="text-sm text-muted">{text}</div>
      <div className={`mt-1 text-3xl font-extrabold tabular-nums ${accent ? "text-accent" : ""}`}>
        {value}
      </div>
      {sub ? <div className="mt-0.5 text-sm text-muted">{sub}</div> : null}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-14 text-center text-base text-muted">
      {children}
    </div>
  );
}
