import type { DrawResult, Entry, PayoutRates } from "./types";

/** เรียงหลักเพื่อเทียบโต๊ด — 123 กับ 321 จะได้ "123" เท่ากัน */
function sortedDigits(value: string): string {
  return value.split("").sort().join("");
}

export function hasAnyResult(r: DrawResult): boolean {
  return r.top2 !== "" || r.bottom2 !== "" || r.top3 !== "" || r.bottom3 !== "";
}

/**
 * ผลรางวัลช่องไหนที่ประเภทนี้ต้องใช้
 * รหัสกี่หลักก็ใช้ผลของหลักนั้น ไม่มีการตัดหลักข้ามกัน
 */
const NEEDS: Record<Entry["type"], keyof DrawResult> = {
  บ: "top2",
  ล: "bottom2",
  ตรง: "top3",
  ต: "top3",
  ล3: "bottom3",
};

export const RESULT_LABEL: Record<keyof DrawResult, string> = {
  top2: "2 ตัวบน",
  bottom2: "2 ตัวล่าง",
  top3: "3 ตัวตรง",
  bottom3: "3 ตัวล่าง",
};

/**
 * ถูกรางวัลไหม — คืน null เมื่อยังไม่ได้ใส่ผลของช่องที่ต้องใช้ จึงยังตรวจไม่ได้
 * โต๊ดนับว่าถูกด้วยเมื่อผลออกตรงเป๊ะ (ตามที่ตกลงกันไว้)
 */
export function isWinner(e: Entry, r: DrawResult): boolean | null {
  if (r[NEEDS[e.type]] === "") return null;

  switch (e.type) {
    case "บ":
      return r.top2 === e.code;
    case "ล":
      return r.bottom2 === e.code;
    case "ตรง":
      return r.top3 === e.code;
    case "ต":
      return sortedDigits(r.top3) === sortedDigits(e.code);
    case "ล3":
      return r.bottom3 === e.code;
  }
}

export interface WinRow {
  entry: Entry;
  payout: number;
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
  /** ช่องผลรางวัลที่ยังขาดและมีคนแทงค้างอยู่ */
  missing: Array<keyof DrawResult>;
}

export function checkRound(
  entries: Entry[],
  result: DrawResult,
  rates: PayoutRates,
): CheckSummary {
  const wins: WinRow[] = [];
  const byName = new Map<string, NameResult>();
  const missing = new Set<keyof DrawResult>();
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

    const won = isWinner(entry, result);
    if (won === null) {
      pending += 1;
      missing.add(NEEDS[entry.type]);
      continue;
    }
    if (!won) continue;

    const money = entry.amount * (rates[entry.type] ?? 0);
    const win: WinRow = { entry, payout: money };
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
