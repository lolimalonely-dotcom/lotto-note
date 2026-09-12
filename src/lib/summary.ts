import { ALL_TYPES, TYPE_LABEL } from "./rules";
import type { Entry, EntryType } from "./types";

export interface Totals {
  count: number;
  amount: number;
}

function emptyByType(): Record<EntryType, Totals> {
  // สร้างจาก ALL_TYPES เพื่อให้เพิ่มประเภทใหม่แล้วไม่ต้องมาแก้ตรงนี้อีก
  return Object.fromEntries(
    ALL_TYPES.map((t) => [t, { count: 0, amount: 0 }]),
  ) as Record<EntryType, Totals>;
}

function bump(target: Record<EntryType, Totals>, e: Entry) {
  target[e.type].count += 1;
  target[e.type].amount += e.amount;
}

export interface NameSummary {
  name: string;
  count: number;
  total: number;
  byType: Record<EntryType, Totals>;
  entries: Entry[];
}

/** สรุปยอดต่อ "ชื่อรายการ" — เรียงตามชื่อ */
export function summarizeByName(entries: Entry[]): NameSummary[] {
  const map = new Map<string, NameSummary>();
  for (const e of entries) {
    let row = map.get(e.name);
    if (!row) {
      row = { name: e.name, count: 0, total: 0, byType: emptyByType(), entries: [] };
      map.set(e.name, row);
    }
    row.count += 1;
    row.total += e.amount;
    row.entries.push(e);
    bump(row.byType, e);
  }
  for (const row of map.values()) {
    // ในบิลเรียงตามลำดับที่คีย์ (เก่า -> ใหม่) อ่านง่ายกว่าเวลาทาน
    row.entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "th"));
}

export interface CodeSummary {
  code: string;
  /** จำนวนบรรทัดที่ลงเลขนี้ */
  count: number;
  total: number;
  byType: Record<EntryType, Totals>;
  /** ชื่อคนที่ลงเลขนี้ ไม่ซ้ำ */
  names: string[];
  /** ทุกบรรทัดของเลขนี้ เรียงยอดมากไปน้อย */
  rows: Entry[];
}

/** สรุปต่อ "เลข" ทุกชื่อรวมกัน — เรียงยอดมากไปน้อย (ดูว่าเลขไหนรับหนัก) */
export function summarizeByCode(entries: Entry[]): CodeSummary[] {
  const map = new Map<string, CodeSummary>();
  for (const e of entries) {
    let row = map.get(e.code);
    if (!row) {
      row = { code: e.code, count: 0, total: 0, byType: emptyByType(), names: [], rows: [] };
      map.set(e.code, row);
    }
    row.count += 1;
    row.total += e.amount;
    row.rows.push(e);
    bump(row.byType, e);
  }
  for (const row of map.values()) {
    row.names = [...new Set(row.rows.map((r) => r.name))].sort((a, b) => a.localeCompare(b, "th"));
    row.rows.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, "th"));
  }
  return [...map.values()].sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
}

/**
 * เลขที่มีคนลงซ้ำกันหลายครั้ง — เรียงตามจำนวนครั้งที่ซ้ำมากไปน้อย
 * ใช้ดูว่าเลขไหนคนแห่กันซื้อ ต้องระวังเป็นพิเศษ
 */
export function duplicateCodes(entries: Entry[]): CodeSummary[] {
  return summarizeByCode(entries)
    .filter((row) => row.count > 1)
    .sort(
      (a, b) =>
        b.count - a.count || b.total - a.total || a.code.localeCompare(b.code),
    );
}

export interface GrandTotals {
  count: number;
  total: number;
  names: number;
  codes: number;
  byType: Record<EntryType, Totals>;
}

export function grandTotals(entries: Entry[]): GrandTotals {
  const byType = emptyByType();
  let total = 0;
  for (const e of entries) {
    total += e.amount;
    bump(byType, e);
  }
  return {
    count: entries.length,
    total,
    names: new Set(entries.map((e) => e.name)).size,
    codes: new Set(entries.map((e) => e.code)).size,
    byType,
  };
}

export const fmt = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });

/** ตารางสรุปเป็น CSV (มี BOM เพื่อให้ Excel อ่านภาษาไทยถูก) */
export function toCsv(entries: Entry[]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ["งวด", "ชื่อรายการ", "ประเภท", "รหัส", "จำนวน", "เวลาที่คีย์"];
  const body = entries
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "th") || a.createdAt.localeCompare(b.createdAt))
    .map((e) =>
      [e.round, e.name, TYPE_LABEL[e.type], e.code, e.amount, e.createdAt].map(esc).join(","),
    );
  return "﻿" + [head.join(","), ...body].join("\r\n");
}

