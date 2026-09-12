import type { EntryType } from "./types";

/** เรียงตามลำดับที่อยากให้แสดงในตารางสรุป */
export const ALL_TYPES: EntryType[] = ["วบ", "วล", "บ", "ล", "ตรง", "ต", "ล3"];

/** ป้ายสั้น ใช้ในตารางและรายการ */
export const TYPE_LABEL: Record<EntryType, string> = {
  วบ: "วิ่งบน",
  วล: "วิ่งล่าง",
  บ: "บ.",
  ล: "ล.",
  ตรง: "ตรง",
  ต: "ต.",
  ล3: "ล.3",
};

/** คำอธิบายเต็ม ใช้บนปุ่มเลือกประเภท */
export const TYPE_FULL: Record<EntryType, string> = {
  วบ: "วิ่งบน",
  วล: "วิ่งล่าง",
  บ: "บ. (2 ตัวบน)",
  ล: "ล. (2 ตัวล่าง)",
  ตรง: "ตรง (3 ตัวบน)",
  ต: "ต. (โต๊ด)",
  ล3: "ล. (3 ตัวล่าง)",
};

export const TYPE_TONE: Record<EntryType, string> = {
  วบ: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300",
  วล: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  บ: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  ล: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  ตรง: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  ต: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  ล3: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
};

/**
 * ประเภทที่เป็นไปได้ตามจำนวนหลักของรหัส
 * ลำดับในอาเรย์คือลำดับที่แสดงบนปุ่ม
 */
export function typesForCode(code: string): EntryType[] {
  if (code.length === 1) return ["วบ", "วล"];
  if (code.length === 2) return ["บ", "ล"];
  if (code.length === 3) return ["ตรง", "ต", "ล3"];
  return [];
}

export function isValidCode(code: string): boolean {
  return /^\d{1,3}$/.test(code);
}

/** กลับเลขมีความหมายเฉพาะรหัสตั้งแต่ 2 หลักขึ้นไป */
export function canPermute(code: string): boolean {
  return /^\d{2,3}$/.test(code);
}
