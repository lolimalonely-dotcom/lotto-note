"use client";

import { useEffect, useRef, useState } from "react";
import { permutations } from "@/lib/permute";
import { isValidCode, TYPE_FULL, typesForCode } from "@/lib/rules";
import { fmt } from "@/lib/summary";
import type { DraftRow, EntryType } from "@/lib/types";
import { btn, btnPrimary, input, Money, TypeBadge } from "./ui";

export function PermuteDialog({
  name,
  onClose,
  onConfirm,
}: {
  name: string;
  onClose(): void;
  onConfirm(rows: DraftRow[]): void;
}) {
  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<EntryType | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    codeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const digits = code.replace(/\D/g, "");
  const valid = isValidCode(digits);
  const choices = valid ? typesForCode(digits) : [];

  // ประเภทเริ่มต้น: ตัวแรกของหลักนั้น (3 หลัก = ตรง ตามที่ตกลงไว้)
  const effectiveType: EntryType | null =
    type && choices.includes(type) ? type : (choices[0] ?? null);

  // ไม่ต้อง useMemo — React Compiler จัดการให้ และ permutations ของ 3 หลักคิดเร็วมากอยู่แล้ว
  const codes = valid ? permutations(digits) : [];
  const per = Number(amount.replace(/,/g, ""));
  const amountOk = Number.isFinite(per) && per > 0;
  const total = amountOk ? per * codes.length : 0;
  const ready = valid && amountOk && effectiveType !== null;

  const submit = () => {
    if (!ready || !effectiveType) return;
    onConfirm(codes.map((c) => ({ code: c, type: effectiveType, amount: per })));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-t-2xl border border-line bg-surface shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div>
            <h2 className="text-base font-bold">กลับเลขอัตโนมัติ</h2>
            <p className="text-xs text-muted">
              ลงในชื่อ <span className="font-semibold text-foreground">{name || "— ยังไม่ได้ตั้งชื่อ —"}</span>
            </p>
          </div>
          <button className={btn} onClick={onClose}>
            ปิด
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-muted">รหัส (2 หรือ 3 หลัก)</span>
              <input
                ref={codeRef}
                className={`${input} keypad-input text-lg`}
                inputMode="numeric"
                placeholder="123"
                maxLength={3}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted">จำนวน (ต่อเลข 1 ตัว)</span>
              <input
                className={`${input} keypad-input text-lg`}
                inputMode="decimal"
                placeholder="300"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit();
                }}
              />
            </label>
          </div>

          <div>
            <span className="mb-1 block text-xs text-muted">ประเภท</span>
            <div className="flex flex-wrap gap-2">
              {choices.length === 0 ? (
                <span className="text-sm text-muted">ใส่รหัสก่อน แล้วประเภทจะขึ้นให้เลือก</span>
              ) : (
                choices.map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      effectiveType === t
                        ? "border-accent bg-accent/10 text-foreground"
                        : "border-line hover:bg-surface-2"
                    }`}
                  >
                    {TYPE_FULL[t]}
                  </button>
                ))
              )}
            </div>
          </div>

          {valid ? (
            <div className="rounded-lg border border-line bg-surface-2 p-3">
              <div className="mb-2 flex items-baseline justify-between text-xs">
                <span className="text-muted">
                  จะได้ <b className="text-foreground">{codes.length}</b> บรรทัด
                </span>
                <span className="text-muted">
                  ยอดรวม <b className="tabular-nums text-foreground">{fmt.format(total)}</b>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {codes.map((c) => (
                  <span
                    key={c}
                    className="keypad-input inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-sm"
                  >
                    {effectiveType ? <TypeBadge type={effectiveType} /> : null}
                    {c}
                    {amountOk ? (
                      <span className="text-muted">
                        ·<Money value={per} className="ml-1" />
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">
              ใส่รหัส 2 หลัก (เช่น 12 → 12, 21) หรือ 3 หลัก (เช่น 123 → 6 ตัว) เลขหลักซ้ำระบบจะตัดตัวซ้ำให้อัตโนมัติ
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-4 py-3">
          <button className={btn} onClick={onClose}>
            ยกเลิก
          </button>
          <button className={btnPrimary} disabled={!ready} onClick={submit}>
            บันทึก {codes.length > 0 ? `${codes.length} บรรทัด` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
