import { isValidCode, typesForCode } from "./rules";
import { permutations } from "./permute";
import type { DraftRow, EntryType } from "./types";

/* ------------------------------------------------------------------ */
/* ตัวช่วยเล็ก ๆ                                                        */
/* ------------------------------------------------------------------ */

const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";

/** แปลงเลขไทยเป็นเลขอารบิก เผื่อสลับแป้นพิมพ์ */
export function normalizeDigits(input: string): string {
  return input.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)));
}

/** คำย่อที่ยอมรับสำหรับระบุประเภทเอง */
const TYPE_ALIASES: Record<string, EntryType> = {
  "บ": "บ", "บ.": "บ", "บน": "บ", b: "บ",
  "ล": "ล", "ล.": "ล", "ล่าง": "ล", l: "ล",
  "ตรง": "ตรง", "ตรง.": "ตรง", s: "ตรง", tr: "ตรง",
  "ต": "ต", "ต.": "ต", "โต๊ด": "ต", "โตด": "ต", t: "ต",
};

/** คำย่อที่สั่งให้กลับเลขอัตโนมัติ */
const PERMUTE_ALIASES = new Set(["ก", "ก.", "กลับ", "p", "perm"]);

function readNumber(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/* ------------------------------------------------------------------ */
/* ผลลัพธ์ของ parser                                                   */
/* ------------------------------------------------------------------ */

export interface ParseMeta {
  /** รหัสทั้งหมดที่จะถูกบันทึก (มากกว่า 1 เมื่อกลับเลข) */
  codes: string[];
  permuted: boolean;
  /** true เมื่อระบบเดาประเภทให้เอง (เกิดได้เฉพาะตอนกลับเลขแบบจำนวนเดียว) */
  assumed: boolean;
}

export type ParseResult =
  | { status: "empty" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: DraftRow[]; meta: ParseMeta }
  | {
      status: "needType";
      code: string;
      amount: number;
      choices: EntryType[];
      meta: ParseMeta;
    };

/* ------------------------------------------------------------------ */
/* parser หลัก                                                          */
/* ------------------------------------------------------------------ */

/**
 * ไวยากรณ์ที่รองรับ (ชื่อรายการมาจากช่องด้านบน ไม่ต้องพิมพ์ซ้ำ):
 *
 *   12 20*30      -> บ.12=20 , ล.12=30
 *   12 20*20      -> บ.12=20 , ล.12=20
 *   12 20         -> ต้องเลือก บ. หรือ ล. เอง
 *   12 20 บ       -> บ.12=20            (ระบุประเภทติดมาในบรรทัดเลย)
 *   123 20*30     -> ตรง.123=20 , ต.123=30
 *   12 20*        -> บ.12=20 อย่างเดียว
 *   12 *30        -> ล.12=30 อย่างเดียว
 *   *123 300      -> กลับเลข 123 ทั้ง 6 ตัว ตัวละ 300 (ประเภท ตรง)
 *   123 300 ก     -> เหมือนบรรทัดบน
 *   *12 20*30 ก   -> กลับเลข 12 -> 12,21 แต่ละตัวลง บ.20 และ ล.30
 *
 * ตัวคั่นจำนวนใช้ * x X × ได้หมด และเว้นวรรครอบตัวคั่นได้
 */
export function parseLine(input: string): ParseResult {
  // # และ = ใช้แทนเว้นวรรคได้ เผื่อคีย์บนแป้นตัวเลขของมือถือที่ไม่มีปุ่มเว้นวรรค
  const text = normalizeDigits(input).replace(/[#=]/g, " ").trim();
  if (text === "") return { status: "empty" };

  const tokens = text.split(/\s+/);

  /* --- 1. รหัส (โทเคนแรก) --- */
  const codeMatch = /^(\*?)(\d+)$/.exec(tokens[0]);
  if (!codeMatch) {
    return { status: "error", message: `"${tokens[0]}" ไม่ใช่รหัส — ต้องเป็นตัวเลขล้วน` };
  }
  let permuted = codeMatch[1] === "*";
  const code = codeMatch[2];
  if (!isValidCode(code)) {
    return {
      status: "error",
      message: `รหัส ${code} มี ${code.length} หลัก — รองรับเฉพาะ 2 หลัก (บ./ล.) กับ 3 หลัก (ตรง/ต.)`,
    };
  }
  const allowed = typesForCode(code);

  /* --- 2. เก็บ flag ท้ายบรรทัด (ประเภท / กลับเลข) --- */
  const rest = tokens.slice(1);
  let explicitType: EntryType | null = null;

  while (rest.length > 0) {
    const tail = rest[rest.length - 1];
    const key = tail.toLowerCase();
    if (PERMUTE_ALIASES.has(key)) {
      permuted = true;
      rest.pop();
      continue;
    }
    const asType = TYPE_ALIASES[key];
    if (asType) {
      if (explicitType && explicitType !== asType) {
        return { status: "error", message: "ระบุประเภทซ้ำกันสองอัน" };
      }
      explicitType = asType;
      rest.pop();
      continue;
    }
    break;
  }

  if (explicitType && !allowed.includes(explicitType)) {
    return {
      status: "error",
      message: `รหัส ${code.length} หลัก เลือกได้เฉพาะ ${allowed.join(" / ")} เท่านั้น`,
    };
  }

  /* --- 3. จำนวน (ที่เหลือทั้งหมด ต่อกันแล้วตัดช่องว่างออก) --- */
  const amountExpr = rest.join("").replace(/[xX×]/g, "*");
  if (amountExpr === "") {
    return { status: "error", message: "ยังไม่ได้ใส่จำนวน — เช่น 20 หรือ 20*30" };
  }

  const codes = permuted ? permutations(code) : [code];
  const meta: ParseMeta = { codes, permuted, assumed: false };

  /* --- 3a. มีตัวคั่น -> กำหนดสองประเภทพร้อมกันอัตโนมัติ --- */
  if (amountExpr.includes("*")) {
    if (explicitType) {
      return {
        status: "error",
        message: "ใส่ * แล้วระบบเลือกประเภทให้เอง ไม่ต้องระบุประเภทอีก",
      };
    }
    const parts = amountExpr.split("*");
    if (parts.length > 2) {
      return { status: "error", message: "ใส่ * ได้แค่ครั้งเดียว เช่น 20*30" };
    }
    const [first, second] = [readNumber(parts[0]), readNumber(parts[1])];
    if (Number.isNaN(first) || Number.isNaN(second)) {
      return { status: "error", message: `อ่านจำนวน "${amountExpr}" ไม่ออก` };
    }

    const pairs: Array<[EntryType, number]> = [];
    if (first !== null && first > 0) pairs.push([allowed[0], first]);
    if (second !== null && second > 0) pairs.push([allowed[1], second]);
    if (pairs.length === 0) {
      return { status: "error", message: "จำนวนต้องมากกว่า 0 อย่างน้อยหนึ่งข้าง" };
    }

    const rows: DraftRow[] = [];
    for (const c of codes) {
      for (const [type, amount] of pairs) rows.push({ code: c, type, amount });
    }
    return { status: "ready", rows, meta };
  }

  /* --- 3b. จำนวนเดียว --- */
  const amount = readNumber(amountExpr);
  if (amount === null || Number.isNaN(amount)) {
    return { status: "error", message: `อ่านจำนวน "${amountExpr}" ไม่ออก` };
  }
  if (amount <= 0) {
    return { status: "error", message: "จำนวนต้องมากกว่า 0" };
  }

  if (explicitType) {
    return {
      status: "ready",
      rows: codes.map((c) => ({ code: c, type: explicitType as EntryType, amount })),
      meta,
    };
  }

  // กลับเลขแบบจำนวนเดียว: ใช้ประเภทแรกของหลักนั้น (3 หลัก = ตรง) แล้วโชว์ให้เห็นใน preview
  if (permuted) {
    return {
      status: "ready",
      rows: codes.map((c) => ({ code: c, type: allowed[0], amount })),
      meta: { ...meta, assumed: true },
    };
  }

  // จำนวนเดียว ไม่ได้บอกประเภท -> ให้ผู้ใช้กดเลือก
  return { status: "needType", code, amount, choices: allowed, meta };
}

/** ใช้ต่อจากสถานะ needType เมื่อผู้ใช้กดเลือกประเภทแล้ว */
export function resolveWithType(
  pending: Extract<ParseResult, { status: "needType" }>,
  type: EntryType,
): DraftRow[] {
  return pending.meta.codes.map((code) => ({ code, type, amount: pending.amount }));
}
