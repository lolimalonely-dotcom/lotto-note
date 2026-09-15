"use client";

import { useMemo, useState } from "react";
import { checkRound, hasAnyResult, PART_LABEL, parseDraw } from "@/lib/check";
import { ALL_TYPES, TYPE_FULL } from "@/lib/rules";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/summary";
import { DEFAULT_RATES, type PayoutRates } from "@/lib/types";
import { btn, btnPrimary, card, Empty, input, Money, TypeBadge } from "./ui";

/* ------------------------------------------------------------------ */
/* ช่องใส่ผลรางวัล — ช่องเดียว พิมพ์รวด ระบบแยกตามจำนวนหลักให้เอง         */
/* ------------------------------------------------------------------ */

function ResultForm() {
  const { result, setResult, round } = useStore();
  const [draft, setDraft] = useState(result.raw);
  const [seen, setSeen] = useState({ round, raw: result.raw });

  // สลับรอบ หรือผลที่บันทึกไว้โหลดมาจากคลาวด์ทีหลัง ให้ช่องกรอกตามไปด้วย
  if (seen.round !== round || seen.raw !== result.raw) {
    setSeen({ round, raw: result.raw });
    setDraft(result.raw);
  }

  const parsed = parseDraw(draft);
  const dirty = draft.trim() !== result.raw.trim();
  const empty = !hasAnyResult(parsed);

  return (
    <div className={`${card} p-4`}>
      <h2 className="mb-1 text-lg font-bold">ผลรางวัลรอบนี้</h2>
      <p className="mb-3 text-base text-muted">
        พิมพ์ทุกเลขในช่องเดียว คั่นด้วยเว้นวรรคหรือจุด ระบบแยกให้เองตามจำนวนหลัก
      </p>

      <textarea
        className={`${input} keypad-input min-h-28 text-2xl leading-relaxed`}
        inputMode="decimal"
        placeholder="123456 789 012 45"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
      />

      {/* ---------- ระบบอ่านได้ว่าอะไร ---------- */}
      {!empty || parsed.invalid.length > 0 ? (
        <ul className="mt-3 space-y-2 rounded-xl bg-surface-2 px-4 py-3 text-base">
          {parsed.firsts.map((n) => (
            <li key={n}>
              <span className="text-muted">รางวัลที่ 1</span>{" "}
              <b className="keypad-input text-lg">{n}</b>
              <span className="text-muted"> → 3 ตัวตรง </span>
              <b className="keypad-input text-lg">{n.slice(-3)}</b>
              <span className="text-muted"> · 2 ตัวบน </span>
              <b className="keypad-input text-lg">{n.slice(-2)}</b>
            </li>
          ))}
          {parsed.bottom3.length > 0 ? (
            <li>
              <span className="text-muted">3 ตัวล่าง</span>{" "}
              <b className="keypad-input text-lg">{parsed.bottom3.join(", ")}</b>
            </li>
          ) : null}
          {parsed.bottom2.length > 0 ? (
            <li>
              <span className="text-muted">2 ตัวล่าง</span>{" "}
              <b className="keypad-input text-lg">{parsed.bottom2.join(", ")}</b>
            </li>
          ) : null}
          {parsed.invalid.length > 0 ? (
            <li className="font-semibold text-red-600 dark:text-red-400">
              อ่านไม่ออก: {parsed.invalid.join(", ")} — ต้องเป็นเลข 2, 3 หรือ 6 หลักเท่านั้น
            </li>
          ) : null}
        </ul>
      ) : null}

      <button
        className={`${btnPrimary} mt-4 h-14 w-full text-lg`}
        disabled={!dirty}
        onClick={() => void setResult({ raw: draft.trim() })}
      >
        {dirty ? "ตรวจรางวัล" : empty ? "พิมพ์ผลรางวัลก่อน" : "ตรวจแล้ว ✓"}
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

/** บอกเลขที่ออกจริง เฉพาะตอนที่ไม่ตรงกับรหัสที่แทง (โต๊ด / วิ่ง) */
function HitNote({ code, hit }: { code: string; hit: string }) {
  if (hit === code) return null;
  return <span className="text-sm text-muted">(ออก {hit})</span>;
}

export function CheckScreen() {
  const { entries, result, rates, round } = useStore();
  const draw = useMemo(() => parseDraw(result.raw), [result.raw]);
  const summary = useMemo(() => checkRound(entries, draw, rates), [entries, draw, rates]);

  const ready = hasAnyResult(draw);
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
          <Empty>พิมพ์ผลรางวัลด้านบนแล้วกด ตรวจรางวัล ระบบจะตรวจให้ทุกรายการทีเดียว</Empty>
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
                ยังตรวจไม่ได้ {summary.pending} บรรทัด เพราะยังไม่ได้ใส่{" "}
                {summary.missing.map((m) => PART_LABEL[m]).join(" และ ")}
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
                        <li key={w.entry.id} className="flex flex-wrap items-center gap-2 text-base">
                          <TypeBadge type={w.entry.type} />
                          <span className="keypad-input text-lg font-bold">{w.entry.code}</span>
                          <HitNote code={w.entry.code} hit={w.hit} />
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
                  <li key={w.entry.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <TypeBadge type={w.entry.type} big />
                    <span className="keypad-input text-xl font-bold">{w.entry.code}</span>
                    <HitNote code={w.entry.code} hit={w.hit} />
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
