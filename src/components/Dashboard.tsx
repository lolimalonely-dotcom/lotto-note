"use client";

import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { fmt, grandTotals, summarizeByName, toCsv, topCodes } from "@/lib/summary";
import { btn, card, Empty, Money, Stat, TypeBadge } from "./ui";

export function Dashboard() {
  const { entries, round } = useStore();

  const totals = useMemo(() => grandTotals(entries), [entries]);
  const hot = useMemo(() => topCodes(entries, 10), [entries]);
  const byName = useMemo(() => summarizeByName(entries), [entries]);

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

      {/* ---------- 10 เลขที่เงินลงเยอะที่สุด ---------- */}
      <div className={card}>
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-lg font-bold">
            {hot.length < 10 ? `เลขที่เงินลงเยอะที่สุด` : `10 เลขที่เงินลงเยอะที่สุด`}
          </h2>
          <p className="text-base text-muted">แจกแจงว่าซื้อประเภทไหน ใครซื้อ เท่าไหร่</p>
        </div>
        <ol className="divide-y divide-line">
          {hot.map((row, i) => (
            <li key={row.code} className="px-4 py-4">
              <div className="flex items-baseline gap-3">
                <span className="w-7 shrink-0 text-base font-bold text-muted">{i + 1}.</span>
                <span className="keypad-input text-3xl font-extrabold">{row.code}</span>
                <span className="ml-auto text-right">
                  <Money value={row.total} className="text-2xl font-extrabold" />
                  <span className="block text-sm text-muted">
                    ซื้อ {row.count} ครั้ง · {row.people} คน
                  </span>
                </span>
              </div>

              <ul className="mt-3 space-y-3 sm:pl-10">
                {row.types.map((t) => (
                  <li key={t.type} className="rounded-xl bg-surface-2 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <TypeBadge type={t.type} big />
                      <Money value={t.total} className="text-xl font-bold" />
                      {t.rows.length > 1 ? (
                        <span className="text-sm text-muted">({t.rows.length} ครั้ง)</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-base text-muted">
                      {t.rows.map((e) => `${e.name} ${fmt.format(e.amount)}`).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </div>

      {/* ---------- แยกตามชื่อคน ---------- */}
      <h2 className="px-1 pt-2 text-lg font-bold">แยกตามชื่อคน</h2>
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
