"use client";

import { useMemo, useState } from "react";
import { checkRound, hasAnyResult, RESULT_LABEL } from "@/lib/check";
import { ALL_TYPES, TYPE_FULL } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/summary";
import { DEFAULT_RATES, type DrawResult, type PayoutRates } from "@/lib/types";
import { btn, btnPrimary, card, Empty, input, Money, numInput, TypeBadge } from "./ui";

/* ------------------------------------------------------------------ */
/* ช่องกรอกผลรางวัล                                                     */
/* ------------------------------------------------------------------ */

const FIELDS: Array<{ key: keyof DrawResult; digits: number }> = [
  { key: "top2", digits: 2 },
  { key: "bottom2", digits: 2 },
  { key: "top3", digits: 3 },
  { key: "bottom3", digits: 3 },
];

function ResultForm() {
  const { result, setResult, round } = useStore();
  const [draft, setDraft] = useState<DrawResult>(result);
  const [saved, setSaved] = useState(false);

  // ถ้าสลับรอบ ให้ช่องกรอกตามรอบใหม่
  const [seenRound, setSeenRound] = useState(round);
  if (seenRound !== round) {
    setSeenRound(round);
    setDraft(result);
    setSaved(false);
  }

  const dirty = FIELDS.some((f) => draft[f.key] !== result[f.key]);

  const badField = FIELDS.find(
    (f) => draft[f.key] !== "" && draft[f.key].length !== f.digits,
  );

  return (
    <div className={`${card} p-4`}>
      <h2 className="mb-1 text-lg font-bold">ผลรางวัลรอบนี้</h2>
      <p className="mb-3 text-base text-muted">ใส่เท่าที่ออกแล้วก็ได้ ช่องที่เว้นไว้จะยังไม่ตรวจ</p>

      <div className="space-y-3">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-base font-semibold text-muted">
              {RESULT_LABEL[f.key]}
            </span>
            <input
              className={`${numInput} flex-1`}
              inputMode="numeric"
              placeholder={"0".repeat(f.digits)}
              maxLength={f.digits}
              value={draft[f.key]}
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                setSaved(false);
                setDraft((d) => ({
                  ...d,
                  [f.key]: e.target.value.replace(/\D/g, "").slice(0, f.digits),
                }));
              }}
            />
          </div>
        ))}
      </div>

      {badField ? (
        <p className="mt-3 text-base font-semibold text-red-600">
          {RESULT_LABEL[badField.key]} ต้องมี {badField.digits} ตัวเลขพอดี
        </p>
      ) : null}

      <button
        className={`${btnPrimary} mt-4 h-14 w-full text-lg`}
        disabled={!dirty || badField !== undefined}
        onClick={() => {
          void setResult(draft);
          setSaved(true);
        }}
      >
        {dirty ? "บันทึกผลรางวัล" : saved ? "บันทึกแล้ว ✓" : "ยังไม่มีอะไรเปลี่ยน"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* อัตราจ่าย (ซ่อนไว้ กดเปิดเมื่อต้องแก้)                                 */
/* ------------------------------------------------------------------ */

function RatesEditor() {
  const { rates, setRates } = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(ALL_TYPES.map((t) => [t, String(rates[t])])),
  );

  if (!open) {
    return (
      <button className={`${btn} w-full`} onClick={() => setOpen(true)}>
        ⚙ ดู / แก้อัตราจ่าย
      </button>
    );
  }

  const parsed: PayoutRates = { ...DEFAULT_RATES };
  let bad = false;
  for (const t of ALL_TYPES) {
    const n = Number((draft[t] ?? "").replace(/,/g, ""));
    if (!Number.isFinite(n) || n < 0) bad = true;
    else parsed[t] = n;
  }

  return (
    <div className={`${card} p-4`}>
      <h2 className="mb-1 text-lg font-bold">อัตราจ่าย</h2>
      <p className="mb-3 text-base text-muted">แทง 1 บาท ถูกแล้วได้กี่บาท</p>

      <div className="space-y-3">
        {ALL_TYPES.map((t) => (
          <div key={t} className="flex items-center gap-3">
            <span className="flex-1 text-base font-semibold">{TYPE_FULL[t]}</span>
            <input
              className={`${input} w-32 text-center text-xl font-bold`}
              inputMode="decimal"
              value={draft[t] ?? ""}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setDraft((d) => ({ ...d, [t]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          className={`${btnPrimary} flex-1`}
          disabled={bad}
          onClick={() => {
            void setRates(parsed);
            setOpen(false);
          }}
        >
          บันทึกอัตรา
        </button>
        <button
          className={btn}
          onClick={() => {
            setDraft(Object.fromEntries(ALL_TYPES.map((t) => [t, String(rates[t])])));
            setOpen(false);
          }}
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function CheckScreen() {
  const { entries, result, rates, round } = useStore();
  const summary = useMemo(() => checkRound(entries, result, rates), [entries, result, rates]);

  const ready = hasAnyResult(result);
  const winners = summary.byName.filter((n) => n.payout > 0);

  return (
    <div className="space-y-4">
      <ResultForm />

      {entries.length === 0 ? (
        <div className={card}>
          <Empty>รอบ {round} ยังไม่มีรายการให้ตรวจ</Empty>
        </div>
      ) : !ready ? (
        <div className={card}>
          <Empty>ใส่ผลรางวัลด้านบนก่อน แล้วระบบจะตรวจให้ทั้งหมดทันที</Empty>
        </div>
      ) : (
        <>
          {/* ---------- กำไรขาดทุน ---------- */}
          <div className={`${card} p-4`}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-base text-muted">ยอดรับทั้งรอบ</div>
                <Money value={summary.staked} className="text-3xl font-extrabold" />
              </div>
              <div>
                <div className="text-base text-muted">ต้องจ่าย</div>
                <Money
                  value={summary.payout}
                  className="text-3xl font-extrabold text-red-600 dark:text-red-400"
                />
              </div>
            </div>
            <div className="mt-4 border-t border-line pt-4">
              <div className="text-base text-muted">
                {summary.net >= 0 ? "เหลือเข้ากระเป๋า" : "ขาดทุน"}
              </div>
              <span
                className={`text-4xl font-extrabold tabular-nums ${
                  summary.net >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {summary.net >= 0 ? "+" : "−"}
                {fmt.format(Math.abs(summary.net))}
              </span>
            </div>
            {summary.pending > 0 ? (
              <p className="mt-3 rounded-xl bg-amber-500/12 px-4 py-3 text-base text-amber-800 dark:text-amber-300">
                ยังตรวจไม่ได้ {summary.pending} บรรทัด เพราะยังไม่ได้ใส่
                {summary.missing.map((m) => ` ${RESULT_LABEL[m]}`).join(" และ")}
              </p>
            ) : null}
          </div>

          {/* ---------- ต้องจ่ายใครบ้าง ---------- */}
          <div className={card}>
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-lg font-bold">ต้องจ่ายใครบ้าง</h2>
            </div>
            {winners.length === 0 ? (
              <Empty>รอบนี้ไม่มีใครถูกเลย</Empty>
            ) : (
              <div className="divide-y divide-line">
                {winners.map((person) => (
                  <div key={person.name} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-lg font-bold">{person.name}</span>
                      <Money
                        value={person.payout}
                        className="text-2xl font-extrabold text-red-600 dark:text-red-400"
                      />
                    </div>
                    <ul className="mt-2 space-y-1.5">
                      {person.wins.map((w) => (
                        <li key={w.entry.id} className="flex items-center gap-2 text-base">
                          <TypeBadge type={w.entry.type} />
                          <span className="keypad-input text-lg font-bold">{w.entry.code}</span>
                          <span className="text-muted">แทง {fmt.format(w.entry.amount)}</span>
                          <Money value={w.payout} className="ml-auto font-bold" />
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-sm text-muted">
                      รับมาจากคนนี้ {fmt.format(person.staked)} · สุทธิ{" "}
                      <b className={person.net >= 0 ? "text-emerald-600" : "text-red-600"}>
                        {person.net >= 0 ? "+" : "−"}
                        {fmt.format(Math.abs(person.net))}
                      </b>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ---------- บรรทัดที่ถูกทั้งหมด ---------- */}
          {summary.wins.length > 0 ? (
            <div className={card}>
              <div className="border-b border-line px-4 py-3">
                <h2 className="text-lg font-bold">บรรทัดที่ถูกทั้งหมด ({summary.wins.length})</h2>
              </div>
              <ul className="divide-y divide-line">
                {summary.wins.map((w) => (
                  <li key={w.entry.id} className="flex items-center gap-3 px-4 py-2.5">
                    <TypeBadge type={w.entry.type} big />
                    <span className="keypad-input text-xl font-bold">{w.entry.code}</span>
                    <span className="truncate text-base text-muted">{w.entry.name}</span>
                    <Money
                      value={w.payout}
                      className="ml-auto text-lg font-extrabold text-red-600 dark:text-red-400"
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}

      <div className="no-print pt-2">
        <RatesEditor />
      </div>
    </div>
  );
}
