"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  duplicateCodes,
  fmt,
  grandTotals,
  summarizeByCode,
  summarizeByName,
  toCsv,
} from "@/lib/summary";
import { btn, card, Empty, Money, Stat, TypeBadge } from "./ui";

export function Dashboard() {
  const { entries, round } = useStore();
  const [tab, setTab] = useState<"name" | "code">("name");

  const totals = useMemo(() => grandTotals(entries), [entries]);
  const byName = useMemo(() => summarizeByName(entries), [entries]);
  const byCode = useMemo(() => summarizeByCode(entries), [entries]);
  const dupes = useMemo(() => duplicateCodes(entries), [entries]);

  const download = () => {
    const blob = new Blob([toCsv(entries)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `สรุป-${round}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (entries.length === 0) {
    return (
      <div className={card}>
        <Empty>รอบ {round} ยังไม่มีรายการ</Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="ยอดรวมทั้งรอบ" value={fmt.format(totals.total)} accent />
        <Stat label="จำนวนคน" value={totals.names} />
        <Stat label="บรรทัดทั้งหมด" value={totals.count} />
        <Stat label="เลขไม่ซ้ำ" value={totals.codes} />
      </div>

      {/* ---------- เลขที่คนลงซ้ำกัน ---------- */}
      {dupes.length > 0 ? (
        <div className={card}>
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-lg font-bold">เลขที่มีคนลงซ้ำกัน</h2>
            <p className="text-base text-muted">เรียงจากซ้ำมากที่สุด — ใช้ดูว่าเลขไหนต้องระวัง</p>
          </div>
          <ul className="divide-y divide-line">
            {dupes.slice(0, 10).map((row) => (
              <li key={row.code} className="flex items-center gap-3 px-4 py-3">
                <span className="keypad-input text-2xl font-bold">{row.code}</span>
                <span className="rounded-lg bg-surface-2 px-2 py-1 text-base font-semibold">
                  ซ้ำ {row.count} ครั้ง
                </span>
                <span className="ml-auto text-right">
                  <Money value={row.total} className="text-xl font-bold" />
                  <span className="block text-sm text-muted">{row.names.length} คน</span>
                </span>
              </li>
            ))}
          </ul>
          {dupes.length > 10 ? (
            <p className="px-4 py-2 text-sm text-muted">แสดง 10 อันดับแรกจาก {dupes.length} เลข</p>
          ) : null}
        </div>
      ) : null}

      {/* ---------- สลับมุมมอง ---------- */}
      <div className="no-print flex gap-2 rounded-2xl border border-line bg-surface p-1.5">
        {(
          [
            ["name", "ดูตามชื่อคน"],
            ["code", "ดูตามเลข"],
          ] as const
        ).map(([key, text]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`min-h-12 flex-1 rounded-xl text-lg font-bold transition ${
              tab === key ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface-2"
            }`}
          >
            {text}
          </button>
        ))}
      </div>

      {/* ---------- ตามชื่อคน ---------- */}
      {tab === "name" ? (
        <div className="space-y-3">
          {byName.map((row) => (
            <div key={row.name} className={card}>
              <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
                <h3 className="truncate text-lg font-bold">{row.name}</h3>
                <Money value={row.total} className="text-2xl font-extrabold" />
              </div>
              <ul className="divide-y divide-line">
                {row.entries.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <TypeBadge type={e.type} big />
                    <span className="keypad-input text-xl font-bold">{e.code}</span>
                    <Money value={e.amount} className="ml-auto text-lg font-semibold" />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        /* ---------- ตามเลข แจกแจงทีละบรรทัด ---------- */
        <div className="space-y-3">
          {byCode.map((row) => (
            <div key={row.code} className={card}>
              <div className="flex items-baseline justify-between border-b border-line px-4 py-3">
                <h3 className="keypad-input text-2xl font-extrabold">{row.code}</h3>
                <span className="text-right">
                  <Money value={row.total} className="text-2xl font-extrabold" />
                  <span className="block text-sm text-muted">{row.count} บรรทัด</span>
                </span>
              </div>
              <ul className="divide-y divide-line">
                {row.rows.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                    <TypeBadge type={e.type} big />
                    <Money value={e.amount} className="text-lg font-bold" />
                    <span className="ml-auto truncate text-base text-muted">{e.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <div className="no-print flex gap-2 pt-2">
        <button className={btn} onClick={download}>
          ↓ บันทึกเป็นไฟล์ Excel
        </button>
        <button className={btn} onClick={() => window.print()}>
          🖨 พิมพ์
        </button>
      </div>
    </div>
  );
}
