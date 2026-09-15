"use client";

import { useEffect, useRef, useState } from "react";
import { permutations } from "@/lib/permute";
import {
  canPermute,
  isRun,
  isValidCode,
  TYPE_FULL,
  TYPE_LABEL,
  typesForCode,
} from "@/lib/rules";
import { useStore } from "@/lib/store";
import { fmt } from "@/lib/summary";
import type { DraftRow, Entry, EntryType } from "@/lib/types";
import { btn, btnPrimary, btnQuiet, card, Empty, input, label, Money, numInput, TypeBadge } from "./ui";

/* ------------------------------------------------------------------ */
/* ชื่อรายการ                                                           */
/* ------------------------------------------------------------------ */

function NamePicker() {
  const { name, setName, names } = useStore();
  // ตั้งต้นเป็น false เสมอ — เงื่อนไขตอน render จัดการกรณียังไม่มีชื่อให้เอง
  // (ถ้าตั้งจาก names.length ตรงนี้ จะค้างค่าตอนข้อมูลยังโหลดไม่เสร็จ)
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const confirm = () => {
    const next = draft.trim();
    if (next === "") return;
    setName(next);
    setDraft("");
    setAdding(false);
  };

  return (
    <div className={`${card} p-4`}>
      <span className={label}>ชื่อรายการ</span>

      {adding || names.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          <input
            className={`${input} min-w-0 flex-1`}
            placeholder="พิมพ์ชื่อ เช่น ป้าสมศรี"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirm();
            }}
          />
          <button className={btnPrimary} onClick={confirm}>
            ใช้ชื่อนี้
          </button>
          {names.length > 0 ? (
            <button className={btn} onClick={() => setAdding(false)}>
              ยกเลิก
            </button>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <select
            className={`${input} h-14 min-w-0 flex-1 text-xl font-bold`}
            value={name}
            onChange={(e) => setName(e.target.value)}
          >
            {!names.includes(name) ? <option value={name}>{name || "— เลือกชื่อ —"}</option> : null}
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <button className={btn} onClick={() => setAdding(true)}>
            + ชื่อใหม่
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* รายการที่คีย์ไว้แล้ว                                                  */
/* ------------------------------------------------------------------ */

function SavedRows({
  rows,
  onRemove,
}: {
  rows: Entry[];
  onRemove(e: Entry): void;
}) {
  if (rows.length === 0) {
    return <Empty>ยังไม่มีรายการ — กรอกด้านบนแล้วกดบันทึก</Empty>;
  }
  return (
    <ul className="divide-y divide-line">
      {rows.map((e) => (
        <li key={e.id} className="flex items-center gap-3 px-4 py-3">
          <TypeBadge type={e.type} big />
          <span className="keypad-input text-2xl font-bold">{e.code}</span>
          <Money value={e.amount} className="ml-auto text-xl font-bold" />
          <button
            className={`${btnQuiet} no-print shrink-0 px-3 text-xl`}
            title="ลบบรรทัดนี้"
            onClick={() => onRemove(e)}
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* หน้าคีย์                                                             */
/* ------------------------------------------------------------------ */

export function EntryScreen() {
  const { entries, add, removeOne, removeBatch, lastBatch, name } = useStore();

  const [code, setCode] = useState("");
  const [permute, setPermute] = useState(false);
  const [picked, setPicked] = useState<EntryType[]>([]);
  const [amounts, setAmounts] = useState<Partial<Record<EntryType, string>>>({});
  const [notice, setNotice] = useState<string | null>(null);

  // จำประเภทที่ใช้ล่าสุดของรหัสแต่ละความยาว เพื่อเลือกให้อัตโนมัติรอบถัดไป
  const lastPicked = useRef<Record<number, EntryType[]>>({});
  const codeRef = useRef<HTMLInputElement>(null);
  const prevLen = useRef(0);

  const digits = code.replace(/\D/g, "");
  const codeOk = isValidCode(digits);
  const allowed = codeOk ? typesForCode(digits) : [];

  // พอความยาวรหัสเปลี่ยน ประเภทที่เลือกได้ก็เปลี่ยน — หยิบของเดิมที่เคยใช้มาให้
  useEffect(() => {
    const len = digits.length;
    if (len === prevLen.current) return;
    prevLen.current = len;
    if (len < 1 || len > 3) return;
    const valid = typesForCode(digits);
    setPicked((current) => {
      const keep = current.filter((t) => valid.includes(t));
      if (keep.length > 0) return keep;
      const remembered = (lastPicked.current[len] ?? []).filter((t) => valid.includes(t));
      return remembered;
    });
  }, [digits]);

  const toggle = (t: EntryType) => {
    setPicked((current) =>
      current.includes(t)
        ? current.filter((x) => x !== t)
        : allowed.filter((a) => a === t || current.includes(a)),
    );
  };

  const permutable = canPermute(digits);
  const permuteOn = permute && permutable;
  const codes = codeOk ? (permuteOn ? permutations(digits) : [digits]) : [];
  // เลขที่วิ่งคลุมอยู่ — วิ่งไม่ต้องติ๊กกลับเลข เพราะคลุมเลขกลับให้เองในบรรทัดเดียว
  const runCovers = codeOk ? permutations(digits) : [];

  const rows: DraftRow[] = [];
  for (const t of picked) {
    const value = Number((amounts[t] ?? "").replace(/,/g, ""));
    if (!Number.isFinite(value) || value <= 0) continue;
    const targets = isRun(t) ? [digits] : codes;
    for (const c of targets) rows.push({ code: c, type: t, amount: value });
  }
  const rowsTotal = rows.reduce((s, r) => s + r.amount, 0);
  const missingAmount = picked.some((t) => {
    const v = Number((amounts[t] ?? "").replace(/,/g, ""));
    return !Number.isFinite(v) || v <= 0;
  });
  const ready = codeOk && picked.length > 0 && !missingAmount && rows.length > 0 && name.trim() !== "";

  const flash = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice((n) => (n === message ? null : n)), 2500);
  };

  const save = async () => {
    if (!ready) return;
    const saved = await add(name.trim(), rows);
    if (saved > 0) {
      lastPicked.current[digits.length] = picked;
      flash(`บันทึกแล้ว ${saved} บรรทัด · รวม ${fmt.format(rowsTotal)}`);
      setCode("");
      setPermute(false);
      prevLen.current = 0;
      codeRef.current?.focus();
    }
  };

  const mine = entries.filter((e) => e.name === name.trim());
  const mineTotal = mine.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-4">
      <NamePicker />

      <div className={`${card} space-y-5 p-4`}>
        {/* ---------- รหัส ---------- */}
        <div>
          <label className={label} htmlFor="code">
            รหัส — 2 ตัว = บน/ล่าง/วิ่ง · 3 ตัว = ตรง/โต๊ด/ล่าง
          </label>
          <input
            id="code"
            ref={codeRef}
            className={numInput}
            inputMode="numeric"
            autoComplete="off"
            placeholder="12"
            maxLength={3}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
          />

          <button
            onClick={() => setPermute((v) => !v)}
            disabled={!permutable}
            className={`mt-3 flex min-h-12 w-full items-center gap-3 rounded-xl border-2 px-4 text-left text-base font-semibold transition disabled:opacity-40 ${
              permuteOn ? "border-accent bg-accent/10" : "border-line hover:bg-surface-2"
            }`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-md border-2 text-base ${
                permuteOn ? "border-accent bg-accent text-accent-fg" : "border-line"
              }`}
            >
              {permuteOn ? "✓" : ""}
            </span>
            <span>
              กลับเลขให้ด้วย
              {permuteOn ? (
                <span className="ml-1 font-normal text-muted">
                  → {codes.join(", ")} ({codes.length} ตัว)
                </span>
              ) : null}
            </span>
          </button>
        </div>

        {/* ---------- ประเภท ---------- */}
        <div>
          <span className={label}>ประเภท (จิ้มเลือก เลือกพร้อมกันหลายอย่างได้)</span>
          {!codeOk ? (
            <p className="rounded-xl bg-surface-2 px-4 py-4 text-base text-muted">
              ใส่รหัสก่อน แล้วปุ่มประเภทจะขึ้นมาให้เลือก
            </p>
          ) : (
            <div className={`grid grid-cols-2 gap-3 ${allowed.length === 3 ? "sm:grid-cols-3" : ""}`}>
              {allowed.map((t) => {
                const on = picked.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() => toggle(t)}
                    className={`flex min-h-16 items-center justify-center rounded-xl border-2 text-xl font-bold transition ${
                      on
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-line bg-surface hover:bg-surface-2"
                    }`}
                  >
                    {TYPE_FULL[t]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------- จำนวน ---------- */}
        {picked.length > 0 ? (
          <div>
            <span className={label}>จำนวน</span>
            <div className="space-y-4">
              {allowed
                .filter((t) => picked.includes(t))
                .map((t) => (
                  <div key={t}>
                    <div className="flex items-center gap-3">
                      <TypeBadge type={t} big />
                      <input
                        className={`${numInput} flex-1`}
                        inputMode="decimal"
                        placeholder="0"
                        value={amounts[t] ?? ""}
                        onChange={(e) => setAmounts((a) => ({ ...a, [t]: e.target.value }))}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void save();
                        }}
                      />
                    </div>
                    {isRun(t) ? (
                      <p className="mt-1 text-base text-muted">
                        ราคาเหมา คลุม {runCovers.join(", ")}
                      </p>
                    ) : permuteOn && codes.length > 1 ? (
                      <p className="mt-1 text-base text-muted">
                        ต่อเลข 1 ตัว × {codes.length} ตัว
                      </p>
                    ) : null}
                  </div>
                ))}
            </div>
          </div>
        ) : null}

        {/* ---------- บันทึก ---------- */}
        <button
          className={`${btnPrimary} h-16 w-full text-xl`}
          disabled={!ready}
          onClick={() => void save()}
        >
          {name.trim() === ""
            ? "ตั้งชื่อรายการก่อน"
            : !codeOk
              ? "ใส่รหัสก่อน"
              : picked.length === 0
                ? "เลือกประเภทก่อน"
                : missingAmount
                  ? "ใส่จำนวนก่อน"
                  : `บันทึก ${rows.length} บรรทัด · รวม ${fmt.format(rowsTotal)}`}
        </button>

        {notice ? (
          <p className="rounded-xl bg-emerald-500/12 px-4 py-3 text-center text-base font-bold text-emerald-700 dark:text-emerald-400">
            {notice}
          </p>
        ) : null}

        {lastBatch ? (
          <button
            className={`${btn} w-full`}
            onClick={() => {
              void removeBatch(lastBatch.id);
              flash("ยกเลิกรายการล่าสุดแล้ว");
            }}
          >
            ↩ ยกเลิกที่เพิ่งบันทึก ({lastBatch.count} บรรทัด)
          </button>
        ) : null}
      </div>

      {/* ---------- รายการของชื่อนี้ ---------- */}
      <div className={card}>
        <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
          <h2 className="truncate text-lg font-bold">{name.trim() || "ยังไม่ได้ตั้งชื่อ"}</h2>
          <span className="text-base text-muted">
            {mine.length} บรรทัด · รวม <b className="tabular-nums text-foreground">{fmt.format(mineTotal)}</b>
          </span>
        </div>
        <SavedRows
          rows={mine}
          onRemove={(e) => {
            if (window.confirm(`ลบ ${TYPE_LABEL[e.type]} ${e.code} จำนวน ${fmt.format(e.amount)} ?`)) {
              void removeOne(e.id);
            }
          }}
        />
      </div>
    </div>
  );
}
