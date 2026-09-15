import type { Entry, EntryType, PayoutRates } from "./types";

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

/** เรียงหลักเพื่อเทียบเลขกลับ — 123 กับ 321 จะได้ "123" เท่ากัน */
function sortedDigits(value: string): string {
  return value.split("").sort().join("");
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/* ------------------------------------------------------------------ */
/* แยกผลรางวัลที่พิมพ์รวดในช่องเดียว                                     */
/* ------------------------------------------------------------------ */

export interface ParsedDraw {
  /** เลข 6 หลัก (รางวัลที่ 1) */
  firsts: string[];
  /** 3 ตัวตรง = 3 หลักท้ายของเลข 6 หลัก */
  top3: string[];
  /** 2 ตัวบน = 2 หลักท้ายของเลข 6 หลัก */
  top2: string[];
  /** เลข 3 หลักที่พิมพ์ = 3 ตัวล่าง */
  bottom3: string[];
  /** เลข 2 หลักที่พิมพ์ = 2 ตัวล่าง */
  bottom2: string[];
  /** เลขที่ไม่ใช่ 2, 3 หรือ 6 หลัก — ไว้เตือนว่าอ่านไม่ออก */
  invalid: string[];
}

/**
 *   "123456 789 012 45" → รางวัลที่ 1 = 123456 (3 ตัวตรง 456 · 2 ตัวบน 56)
 *                         3 ตัวล่าง = 789, 012 · 2 ตัวล่าง = 45
 * คั่นด้วยอะไรก็ได้ที่ไม่ใช่ตัวเลข (เว้นวรรค จุด จุลภาค ขึ้นบรรทัดใหม่) และรับเลขไทย
 */
export function parseDraw(raw: string): ParsedDraw {
  const text = raw.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)));
  const firsts: string[] = [];
  const bottom3: string[] = [];
  const bottom2: string[] = [];
  const invalid: string[] = [];

  for (const token of text.match(/\d+/g) ?? []) {
    if (token.length === 6) firsts.push(token);
    else if (token.length === 3) bottom3.push(token);
    else if (token.length === 2) bottom2.push(token);
    else invalid.push(token);
  }

  const uniqueFirsts = unique(firsts);
  return {
    firsts: uniqueFirsts,
    top3: unique(uniqueFirsts.map((n) => n.slice(-3))),
    top2: unique(uniqueFirsts.map((n) => n.slice(-2))),
    bottom3: unique(bottom3),
    bottom2: unique(bottom2),
    invalid: unique(invalid),
  };
}

export function hasAnyResult(d: ParsedDraw): boolean {
  return d.firsts.length > 0 || d.bottom3.length > 0 || d.bottom2.length > 0;
}

/* ------------------------------------------------------------------ */
/* ตรวจทีละบรรทัด                                                      */
/* ------------------------------------------------------------------ */

/** ส่วนของผลรางวัลที่แต่ละประเภทต้องใช้ */
export type DrawPart = "first" | "bottom3" | "bottom2";

const NEEDS: Record<EntryType, DrawPart> = {
  บ: "first",
  วบ: "first",
  ตรง: "first",
  ต: "first",
  ล: "bottom2",
  วล: "bottom2",
  ล3: "bottom3",
};

export const PART_LABEL: Record<DrawPart, string> = {
  first: "เลข 6 หลัก",
  bottom3: "3 ตัวล่าง",
  bottom2: "2 ตัวล่าง",
};

function partReady(d: ParsedDraw, part: DrawPart): boolean {
  if (part === "first") return d.firsts.length > 0;
  if (part === "bottom3") return d.bottom3.length > 0;
  return d.bottom2.length > 0;
}

/**
 * หาเลขในผลรางวัลที่ทำให้บรรทัดนี้ถูก
 *   undefined = ยังตรวจไม่ได้ เพราะยังไม่ได้ใส่ผลส่วนที่ต้องใช้
 *   null      = ไม่ถูก
 *   string    = ถูก และนี่คือเลขที่ออก
 *
 * โต๊ดและวิ่งนับว่าถูกเมื่อผลเป็นเลขกลับ รวมถึงตรงเป๊ะด้วย
 */
export function findHit(e: Entry, d: ParsedDraw): string | null | undefined {
  if (!partReady(d, NEEDS[e.type])) return undefined;

  const exact = (n: string) => n === e.code;
  const reversed = (n: string) => sortedDigits(n) === sortedDigits(e.code);

  let hit: string | undefined;
  switch (e.type) {
    case "บ":
      hit = d.top2.find(exact);
      break;
    case "ล":
      hit = d.bottom2.find(exact);
      break;
    case "วบ":
      hit = d.top2.find(reversed);
      break;
    case "วล":
      hit = d.bottom2.find(reversed);
      break;
    case "ตรง":
      hit = d.top3.find(exact);
      break;
    case "ต":
      hit = d.top3.find(reversed);
      break;
    case "ล3":
      hit = d.bottom3.find(exact);
      break;
  }
  return hit ?? null;
}

export interface WinRow {
  entry: Entry;
  payout: number;
  /** เลขที่ออกและทำให้ถูก — ต่างจากรหัสได้ถ้าเป็นโต๊ดหรือวิ่ง */
  hit: string;
}

export interface NameResult {
  name: string;
  /** ยอดที่รับมาจากคนนี้ */
  staked: number;
  /** ยอดที่ต้องจ่ายคืนคนนี้ */
  payout: number;
  /** บวก = เราได้ / ลบ = เราเสีย */
  net: number;
  lines: number;
  wins: WinRow[];
}

export interface CheckSummary {
  staked: number;
  payout: number;
  net: number;
  wins: WinRow[];
  byName: NameResult[];
  /** บรรทัดที่ยังตรวจไม่ได้เพราะผลรางวัลยังใส่ไม่ครบ */
  pending: number;
  /** ส่วนของผลรางวัลที่ยังขาดและมีคนแทงค้างอยู่ */
  missing: DrawPart[];
}

export function checkRound(
  entries: Entry[],
  draw: ParsedDraw,
  rates: PayoutRates,
): CheckSummary {
  const wins: WinRow[] = [];
  const byName = new Map<string, NameResult>();
  const missing = new Set<DrawPart>();
  let staked = 0;
  let payout = 0;
  let pending = 0;

  for (const entry of entries) {
    staked += entry.amount;

    let row = byName.get(entry.name);
    if (!row) {
      row = { name: entry.name, staked: 0, payout: 0, net: 0, lines: 0, wins: [] };
      byName.set(entry.name, row);
    }
    row.staked += entry.amount;
    row.lines += 1;

    const hit = findHit(entry, draw);
    if (hit === undefined) {
      pending += 1;
      missing.add(NEEDS[entry.type]);
      continue;
    }
    if (hit === null) continue;

    const money = entry.amount * (rates[entry.type] ?? 0);
    const win: WinRow = { entry, payout: money, hit };
    wins.push(win);
    row.wins.push(win);
    row.payout += money;
    payout += money;
  }

  for (const row of byName.values()) {
    row.net = row.staked - row.payout;
    row.wins.sort((a, b) => b.payout - a.payout);
  }

  wins.sort((a, b) => b.payout - a.payout);

  return {
    staked,
    payout,
    net: staked - payout,
    wins,
    // คนที่ต้องจ่ายเยอะสุดขึ้นก่อน แล้วค่อยเรียงตามชื่อ
    byName: [...byName.values()].sort(
      (a, b) => b.payout - a.payout || a.name.localeCompare(b.name, "th"),
    ),
    pending,
    missing: [...missing],
  };
}
