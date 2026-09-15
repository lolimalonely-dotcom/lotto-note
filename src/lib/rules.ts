import type { EntryType } from "./types";

/** เรียงตามลำดับที่อยากให้แสดงในตารางสรุป */
export const ALL_TYPES: EntryType[] = ["บ", "ล", "วบ", "วล", "ตรง", "ต", "ล3"];

/** ป้ายสั้น ใช้ในตารางและรายการ */
export const TYPE_LABEL: Record<EntryType, string> = {
  บ: "บ.",
  ล: "ล.",
  วบ: "วิ่ง บ.",
  วล: "วิ่ง ล.",
  ตรง: "ตรง",
  ต: "ต.",
  ล3: "ล.3",
};

/** คำอธิบายเต็ม ใช้บนปุ่มเลือกประเภท */
export const TYPE_FULL: Record<EntryType, string> = {
  บ: "บ. (2 ตัวบน)",
  ล: "ล. (2 ตัวล่าง)",
  วบ: "วิ่ง บ.",
  วล: "วิ่ง ล.",
  ตรง: "ตรง",
  ต: "ต. (โต๊ด)",
  ล3: "ล. (3 ตัวล่าง)",
};

export const TYPE_TONE: Record<EntryType, string> = {
  บ: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  ล: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  วบ: "bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300",
  วล: "bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300",
  ตรง: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  ต: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300",
  ล3: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
};

/**
 * ประเภทที่เป็นไปได้ตามจำนวนหลักของรหัส
 * ลำดับในอาเรย์คือลำดับที่แสดงบนปุ่ม
 */
export function typesForCode(code: string): EntryType[] {
  if (code.length === 2) return ["บ", "ล", "วบ", "วล"];
  if (code.length === 3) return ["ตรง", "ต", "ล3"];
  return [];
}

/** วิ่ง = หนึ่งบรรทัดคลุมเลขกลับทั้งหมด ราคาเหมา */
export function isRun(type: EntryType): boolean {
  return type === "วบ" || type === "วล";
}

export function isValidCode(code: string): boolean {
  return /^\d{2,3}$/.test(code);
}

/** กลับเลขใช้ได้กับทุกรหัสที่ถูกต้อง (2 หรือ 3 หลัก) */
export function canPermute(code: string): boolean {
  return isValidCode(code);
}
