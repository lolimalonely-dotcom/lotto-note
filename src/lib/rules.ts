import type { EntryType } from "./types";

export const ALL_TYPES: EntryType[] = ["บ", "ล", "ตรง", "ต"];

/** ป้ายสั้นที่ใช้แสดงในตาราง */
export const TYPE_LABEL: Record<EntryType, string> = {
  ตรง: "ตรง",
  บ: "บ.",
  ล: "ล.",
  ต: "ต.",
};

/** คำอธิบายเต็ม ใช้ในปุ่มเลือกประเภท */
export const TYPE_FULL: Record<EntryType, string> = {
  ตรง: "ตรง (3 ตัวตรง)",
  บ: "บ. (2 ตัวบน)",
  ล: "ล. (2 ตัวล่าง)",
  ต: "ต. (โต๊ด)",
};

export const TYPE_TONE: Record<EntryType, string> = {
  บ: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  ล: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  ตรง: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  ต: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
};

/**
 * ประเภทที่เป็นไปได้ตามจำนวนหลักของรหัส
 * ลำดับในอาเรย์คือลำดับที่ใช้ตีความ "a*b" (ตัวแรก*ตัวหลัง)
 */
export function typesForCode(code: string): EntryType[] {
  if (code.length === 2) return ["บ", "ล"];
  if (code.length === 3) return ["ตรง", "ต"];
  return [];
}

export function isValidCode(code: string): boolean {
  return /^\d{2,3}$/.test(code);
}
