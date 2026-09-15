/**
 * ประเภทการแทง — จำนวนหลักของรหัสเป็นตัวกำหนดว่าเลือกอะไรได้บ้าง
 *   2 หลัก : บ (2 ตัวบน) · ล (2 ตัวล่าง) · วบ (วิ่งบน) · วล (วิ่งล่าง)
 *   3 หลัก : ตรง · ต (โต๊ด) · ล3 (3 ตัวล่าง)
 *
 * วิ่ง = แทงเลข 2 หลักแบบเหมาคลุมเลขกลับในราคาเดียว
 *   วิ่ง บ. 12 จำนวน 20 → คลุมทั้ง 12 และ 21 เก็บเงิน 20 · ถูกแล้วจ่ายตามอัตราวิ่ง
 */
export type EntryType = "บ" | "ล" | "วบ" | "วล" | "ตรง" | "ต" | "ล3";

export interface Entry {
  id: string;
  round: string;
  name: string;
  code: string;
  type: EntryType;
  amount: number;
  /** จัดกลุ่มบรรทัดที่เกิดจากการกดบันทึกครั้งเดียว ใช้สำหรับ "ยกเลิกที่เพิ่งบันทึก" */
  batchId: string;
  createdAt: string;
}

/** แถวที่กำลังจะบันทึก ยังไม่มี id / รอบ / ชื่อรายการ */
export interface DraftRow {
  code: string;
  type: EntryType;
  amount: number;
}

/**
 * ผลรางวัลของรอบหนึ่ง — เก็บเป็นข้อความตามที่ผู้ใช้พิมพ์
 * แล้วค่อยแยกตามจำนวนหลักตอนตรวจ (ดู parseDraw ใน check.ts)
 */
export interface DrawResult {
  /** เช่น "123456 789 012 45" */
  raw: string;
}

export const EMPTY_RESULT: DrawResult = { raw: "" };

/**
 * อ่านผลรางวัลที่เก็บไว้ให้ปลอดภัย
 * ข้อมูลโครงเก่า (แยกเป็น 4 ช่อง) ถูกทิ้ง เพราะประกอบกลับเป็นเลข 6 หลักไม่ได้
 */
export function normalizeResult(raw: unknown): DrawResult {
  const src = (raw ?? {}) as { raw?: unknown };
  return { raw: typeof src.raw === "string" ? src.raw : "" };
}

/** อัตราจ่าย — แทง 1 บาท ถูกแล้วได้กี่บาท */
export type PayoutRates = Record<EntryType, number>;

export const DEFAULT_RATES: PayoutRates = {
  บ: 70,
  ล: 70,
  วบ: 3,
  วล: 4,
  ตรง: 500,
  ต: 100,
  ล3: 110,
};

/** รับเฉพาะประเภทที่มีอยู่จริง และต้องเป็นตัวเลขเท่านั้น */
export function normalizeRates(raw: unknown): PayoutRates {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_RATES };
  for (const key of Object.keys(DEFAULT_RATES) as EntryType[]) {
    const value = Number(src[key]);
    if (src[key] !== undefined && Number.isFinite(value) && value >= 0) out[key] = value;
  }
  return out;
}
