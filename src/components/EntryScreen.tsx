"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseLine, resolveWithType, type ParseResult } from "@/lib/parse";
import { TYPE_FULL } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/summary";
import type { DraftRow, Entry } from "@/lib/types";
import { PermuteDialog } from "./PermuteDialog";
import { btn, btnGhost, btnPrimary, card, Empty, input, Money, TypeBadge } from "./ui";

const HINTS: Array<[string, string]> = [
  ["12 20*30", "บ.=20 ล.=30"],
  ["123 20*30", "ตรง=20 ต.=30"],
  ["12 20", "ถามประเภท"],
  ["12 20 บ", "ระบุประเภทเลย"],
  ["*123 300", "กลับเลข 6 ตัว"],
];

function rowsTotal(rows: DraftRow[]): number {
  return rows.reduce((sum, r) => sum + r.amount, 0);
}

/* ------------------------------------------------------------------ */
/* พรีวิวใต้ช่องคีย์                                                    */
/* ------------------------------------------------------------------ */

function Preview({ result }: { result: ParseResult }) {
  if (result.status === "empty") {
    return (
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {HINTS.map(([sample, meaning]) => (
          <span key={sample} className="rounded-md border border-line bg-surface-2 px-2 py-1">
            <b className="keypad-input text-foreground">{sample}</b>
            <span className="ml-1.5">{meaning}</span>
          </span>
        ))}
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
        {result.message}
      </p>
    );
  }

  if (result.status === "needType") {
    return (
      <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
        กด Enter แล้วเลือกประเภท ({result.choices.join(" หรือ ")}) — หรือพิมพ์ต่อท้ายได้เลย เช่น{" "}
        <b className="keypad-input">
          {result.code} {result.amount} {result.choices[0]}
        </b>
      </p>
    );
  }

  const { rows, meta } = result;
  return (
    <div className="rounded-lg border border-emerald-300/50 bg-emerald-500/8 p-2.5 dark:border-emerald-500/25">
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 text-xs">
        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
          Enter เพื่อบันทึก {rows.length} บรรทัด
        </span>
        <span className="text-muted">
          ยอดรวม <b className="tabular-nums text-foreground">{fmt.format(rowsTotal(rows))}</b>
        </span>
        {meta.permuted ? (
          <span className="rounded bg-violet-500/15 px-1.5 py-0.5 font-semibold text-violet-700 dark:text-violet-300">
            กลับเลข {meta.codes.length} ตัว
          </span>
        ) : null}
        {meta.assumed ? <span className="text-muted">(ประเภทตั้งต้น — ต่อท้ายเพื่อเปลี่ยน)</span> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {rows.slice(0, 24).map((r, i) => (
          <span
            key={`${r.code}-${r.type}-${i}`}
            className="keypad-input inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 py-1 text-sm"
          >
            <TypeBadge type={r.type} />
            {r.code}
            <span className="text-muted">
              ·<Money value={r.amount} className="ml-1" />
            </span>
          </span>
        ))}
        {rows.length > 24 ? (
          <span className="self-center text-xs text-muted">+ อีก {rows.length - 24}</span>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ตารางบรรทัดที่คีย์แล้ว                                                */
/* ------------------------------------------------------------------ */

function EntryRows({
  entries,
  highlight,
  showName,
  onRemove,
}: {
  entries: Entry[];
  highlight: string | null;
  showName: boolean;
  onRemove(id: string): void;
}) {
  if (entries.length === 0) {
    return <Empty>ยังไม่มีบรรทัดในงวดนี้ — คีย์ช่องด้านบนได้เลย</Empty>;
  }
  return (
    <ul className="divide-y divide-line">
      {entries.map((e) => (
        <li
          key={e.id}
          className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
            e.batchId === highlight ? "bg-emerald-500/8" : ""
          }`}
        >
          <TypeBadge type={e.type} />
          <span className="keypad-input text-base font-semibold">{e.code}</span>
          {showName ? (
            <span className="truncate text-xs text-muted">{e.name}</span>
          ) : null}
          <Money value={e.amount} className="ml-auto font-semibold" />
          <button
            className={`${btnGhost} no-print`}
            onClick={() => onRemove(e.id)}
            aria-label={`ลบ ${e.code}`}
            title="ลบบรรทัดนี้"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* หน้าจอหลัก                                                           */
/* ------------------------------------------------------------------ */

export function EntryScreen() {
  const { entries, names, add, removeOne, removeBatch, removeName, lastBatch, round, name, setName } =
    useStore();

  const [line, setLine] = useState("");
  const [pending, setPending] = useState<Extract<ParseResult, { status: "needType" }> | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [permuteOpen, setPermuteOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const lineRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const firstChoiceRef = useRef<HTMLButtonElement>(null);

  const preview = useMemo(() => parseLine(line), [line]);

  const flash = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast((t) => (t === message ? null : t)), 2600);
  }, []);

  const commit = useCallback(
    async (rows: DraftRow[]) => {
      const trimmed = name.trim();
      if (!trimmed) {
        flash("ใส่ชื่อรายการก่อน");
        nameRef.current?.focus();
        return;
      }
      const n = await add(trimmed, rows);
      if (n > 0) {
        setLine("");
        setPending(null);
        flash(`เพิ่ม ${n} บรรทัด · รวม ${fmt.format(rowsTotal(rows))}`);
        lineRef.current?.focus();
      }
    },
    [add, name, flash],
  );

  const submitLine = useCallback(() => {
    if (preview.status === "ready") {
      void commit(preview.rows);
    } else if (preview.status === "needType") {
      setPending(preview);
    }
  }, [preview, commit]);

  /* คีย์ลัดตอนต้องเลือกประเภท: กด 1 / 2 หรือ Esc */
  useEffect(() => {
    if (!pending) return;
    firstChoiceRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPending(null);
        lineRef.current?.focus();
        return;
      }
      const idx = Number(e.key) - 1;
      if (Number.isInteger(idx) && idx >= 0 && idx < pending.choices.length) {
        e.preventDefault();
        void commit(resolveWithType(pending, pending.choices[idx]));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, commit]);

  /* คีย์ลัดทั่วหน้าจอ: F2 = กลับเลข, Ctrl+Z = เลิกทำชุดล่าสุด */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setPermuteOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && lastBatch) {
        e.preventDefault();
        void removeBatch(lastBatch.id);
        flash(`เลิกทำ ${lastBatch.count} บรรทัด`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lastBatch, removeBatch, flash]);

  const currentName = name.trim();
  const visible = useMemo(
    () => (showAll || !currentName ? entries : entries.filter((e) => e.name === currentName)),
    [entries, showAll, currentName],
  );
  const visibleTotal = useMemo(() => visible.reduce((s, e) => s + e.amount, 0), [visible]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
      {/* ---------------- ซ้าย: ช่องคีย์ ---------------- */}
      <section className="space-y-3">
        <div className={`${card} p-3`}>
          <label className="mb-1 block text-xs font-medium text-muted" htmlFor="name">
            ชื่อรายการ (ล็อกไว้ คีย์ได้หลายบรรทัดต่อเนื่อง)
          </label>
          <div className="flex gap-2">
            <input
              id="name"
              ref={nameRef}
              list="name-options"
              className={`${input} text-lg font-semibold`}
              placeholder="เช่น รายการ A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lineRef.current?.focus();
                }
              }}
            />
            <datalist id="name-options">
              {names.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
            {name ? (
              <button className={btn} onClick={() => setName("")} title="ขึ้นชื่อใหม่">
                ล้างชื่อ
              </button>
            ) : null}
          </div>
        </div>

        <div className={`${card} p-3`}>
          <div className="mb-1 flex items-baseline justify-between">
            <label className="text-xs font-medium text-muted" htmlFor="line">
              รหัส + จำนวน
            </label>
            <button className={btnGhost} onClick={() => setPermuteOpen(true)}>
              ⟲ กลับเลข <span className="ml-1 opacity-60">F2</span>
            </button>
          </div>
          <input
            id="line"
            ref={lineRef}
            className={`${input} keypad-input h-14 text-2xl`}
            placeholder="12 20*30"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={line}
            onChange={(e) => {
              setLine(e.target.value);
              setPending(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitLine();
              } else if (e.key === "Escape") {
                setLine("");
              }
            }}
          />

          <div className="mt-2">
            {pending ? (
              <div className="rounded-lg border border-accent/40 bg-accent/8 p-3">
                <p className="mb-2 text-sm">
                  <b className="keypad-input">
                    {pending.code} · {fmt.format(pending.amount)}
                  </b>{" "}
                  — เลือกประเภท
                  {pending.meta.permuted ? ` (กลับเลข ${pending.meta.codes.length} ตัว)` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {pending.choices.map((t, i) => (
                    <button
                      key={t}
                      ref={i === 0 ? firstChoiceRef : undefined}
                      className={btnPrimary}
                      onClick={() => void commit(resolveWithType(pending, t))}
                    >
                      <span className="rounded bg-black/15 px-1.5 text-xs">{i + 1}</span>
                      {TYPE_FULL[t]}
                    </button>
                  ))}
                  <button
                    className={btn}
                    onClick={() => {
                      setPending(null);
                      lineRef.current?.focus();
                    }}
                  >
                    ยกเลิก (Esc)
                  </button>
                </div>
              </div>
            ) : (
              <Preview result={preview} />
            )}
          </div>
        </div>

        {toast ? (
          <p className="rounded-lg bg-accent/12 px-3 py-2 text-sm font-medium text-accent">{toast}</p>
        ) : null}

        {lastBatch ? (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span>ล่าสุด: {lastBatch.label}</span>
            <button className={btn} onClick={() => void removeBatch(lastBatch.id)}>
              เลิกทำ (Ctrl+Z)
            </button>
          </div>
        ) : null}
      </section>

      {/* ---------------- ขวา: บรรทัดที่คีย์แล้ว ---------------- */}
      <section className={`${card} flex max-h-[calc(100vh-8rem)] flex-col overflow-hidden lg:sticky lg:top-20`}>
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold">
              {showAll || !currentName ? `ทุกชื่อ · งวด ${round}` : currentName}
            </h2>
            <p className="text-xs text-muted">
              {visible.length} บรรทัด · รวม <b className="tabular-nums">{fmt.format(visibleTotal)}</b>
            </p>
          </div>
          <button className={btnGhost} onClick={() => setShowAll((v) => !v)}>
            {showAll ? "ดูเฉพาะชื่อนี้" : "ดูทุกชื่อ"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <EntryRows
            entries={visible}
            highlight={lastBatch?.id ?? null}
            showName={showAll || !currentName}
            onRemove={(id) => void removeOne(id)}
          />
        </div>

        {currentName && !showAll && visible.length > 0 ? (
          <div className="border-t border-line px-3 py-2">
            <button
              className={btn}
              onClick={() => {
                if (window.confirm(`ลบทุกบรรทัดของ "${currentName}" ในงวด ${round}?`)) {
                  void removeName(currentName);
                }
              }}
            >
              ลบทั้งชื่อนี้
            </button>
          </div>
        ) : null}
      </section>

      {permuteOpen ? (
        <PermuteDialog
          name={currentName}
          onClose={() => {
            setPermuteOpen(false);
            lineRef.current?.focus();
          }}
          onConfirm={(rows) => {
            setPermuteOpen(false);
            void commit(rows);
          }}
        />
      ) : null}
    </div>
  );
}
