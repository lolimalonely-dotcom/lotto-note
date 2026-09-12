"use client";

import { useMemo, useState } from "react";
import { ALL_TYPES, TYPE_LABEL } from "@/lib/rules";
import { useStore } from "@/lib/store";
import {
  fmt,
  grandTotals,
  summarizeByCode,
  summarizeByName,
  toCsv,
  type NameSummary,
} from "@/lib/summary";
import { btn, card, Empty, Money, Stat, TypeBadge } from "./ui";

function TypeStrip({ byType }: { byType: ReturnType<typeof grandTotals>["byType"] }) {
  const shown = ALL_TYPES.filter((t) => byType[t].count > 0);
  if (shown.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface-2 px-2 py-1 text-xs"
        >
          <TypeBadge type={t} />
          <Money value={byType[t].amount} className="font-semibold" />
          <span className="text-muted">({byType[t].count})</span>
        </span>
      ))}
    </div>
  );
}

function NameCard({ row }: { row: NameSummary }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={card}>
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-muted">{open ? "▾" : "▸"}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-bold">{row.name}</span>
          <span className="text-xs text-muted">{row.count} บรรทัด</span>
        </span>
        <span className="text-right">
          <Money value={row.total} className="text-xl font-bold" />
        </span>
      </button>

      <div className="px-4 pb-3">
        <TypeStrip byType={row.byType} />
      </div>

      {open ? (
        <ul className="divide-y divide-line border-t border-line">
          {row.entries.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-4 py-1.5 text-sm">
              <TypeBadge type={e.type} />
              <span className="keypad-input font-semibold">{e.code}</span>
              <span className="text-xs text-muted">จำนวน</span>
              <Money value={e.amount} className="ml-auto font-semibold" />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function Dashboard() {
  const { entries, round } = useStore();
  const [tab, setTab] = useState<"name" | "code">("name");

  const totals = useMemo(() => grandTotals(entries), [entries]);
  const byName = useMemo(() => summarizeByName(entries), [entries]);
  const byCode = useMemo(() => summarizeByCode(entries), [entries]);

  const download = () => {
    const blob = new Blob([toCsv(entries)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `สรุปงวด-${round}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (entries.length === 0) {
    return (
      <div className={card}>
        <Empty>ยังไม่มีข้อมูลในงวด {round}</Empty>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="ยอดรวมทั้งงวด" value={fmt.format(totals.total)} accent sub={`งวด ${round}`} />
        <Stat label="จำนวนรายการ" value={totals.names} sub="ชื่อที่คีย์" />
        <Stat label="บรรทัดทั้งหมด" value={totals.count} />
        <Stat label="เลขที่ไม่ซ้ำ" value={totals.codes} />
      </div>

      <div className={`${card} p-3`}>
        <div className="mb-2 text-xs font-medium text-muted">แยกตามประเภท</div>
        <TypeStrip byType={totals.byType} />
      </div>

      <div className="no-print flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-line bg-surface p-0.5">
          {(
            [
              ["name", "ตามรายการ"],
              ["code", "ตามเลข"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === key ? "bg-accent text-accent-fg" : "text-muted hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <button className={btn} onClick={download}>
            ↓ CSV
          </button>
          <button className={btn} onClick={() => window.print()}>
            พิมพ์
          </button>
        </div>
      </div>

      {tab === "name" ? (
        <div className="space-y-2">
          {byName.map((row) => (
            <NameCard key={row.name} row={row} />
          ))}
        </div>
      ) : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-125 text-sm">
            <thead className="border-b border-line text-xs text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">เลข</th>
                {ALL_TYPES.map((t) => (
                  <th key={t} className="px-3 py-2 text-right font-medium">
                    {TYPE_LABEL[t]}
                  </th>
                ))}
                <th className="px-4 py-2 text-right font-medium">รวม</th>
                <th className="px-4 py-2 text-left font-medium">ใครลงบ้าง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {byCode.map((row) => (
                <tr key={row.code} className="hover:bg-surface-2">
                  <td className="keypad-input px-4 py-2 text-base font-bold">{row.code}</td>
                  {ALL_TYPES.map((t) => (
                    <td key={t} className="px-3 py-2 text-right tabular-nums">
                      {row.byType[t].amount > 0 ? (
                        fmt.format(row.byType[t].amount)
                      ) : (
                        <span className="text-muted">–</span>
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <Money value={row.total} className="font-bold" />
                  </td>
                  <td className="max-w-60 truncate px-4 py-2 text-xs text-muted" title={row.names.join(", ")}>
                    {row.names.join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-2 text-xs text-muted">เรียงยอดมากไปน้อย — ใช้ดูว่าเลขไหนรับหนัก</p>
        </div>
      )}
    </div>
  );
}
