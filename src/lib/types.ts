/**
 * ประเภทการแทง — จำนวนหลักของรหัสเป็นตัวกำหนดว่าเลือกอะไรได้บ้าง
 *   2 หลัก : บ (2 ตัวบน) · ล (2 ตัวล่าง)
 *   3 หลัก : ตรง · ต (โต๊ด) · ล3 (3 ตัวล่าง)
 *
 * รหัสกี่หลักก็เทียบกับผลรางวัลของหลักนั้นเท่านั้น ไม่มีการตัดหลักข้ามกัน
 */
export type EntryType = "บ" | "ล" | "ตรง" | "ต" | "ล3";

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

/** ผลรางวัลของรอบหนึ่ง — เว้นว่างได้ถ้ายังไม่ออก */
export interface DrawResult {
  /** 2 ตัวบน */
  top2: string;
  /** 2 ตัวล่าง */
  bottom2: string;
  /** 3 ตัวตรง */
  top3: string;
  /** 3 ตัวล่าง */
  bottom3: string;
}

export const EMPTY_RESULT: DrawResult = { top2: "", bottom2: "", top3: "", bottom3: "" };

/**
 * เติมช่องที่ขาดให้ครบและตัดค่าที่ไม่ใช่สตริงทิ้ง
 * จำเป็นเพราะข้อมูลที่เคยเก็บไว้ก่อนหน้านี้ยังไม่มีช่อง 2 ตัวบน
 */
export function normalizeResult(raw: unknown): DrawResult {
  const src = (raw ?? {}) as Partial<Record<keyof DrawResult, unknown>>;
  const pick = (k: keyof DrawResult) => (typeof src[k] === "string" ? (src[k] as string) : "");
  return {
    top2: pick("top2"),
    bottom2: pick("bottom2"),
    top3: pick("top3"),
    bottom3: pick("bottom3"),
  };
}

/** อัตราจ่าย — แทง 1 บาท ถูกแล้วได้กี่บาท */
export type PayoutRates = Record<EntryType, number>;

export const DEFAULT_RATES: PayoutRates = {
  บ: 70,
  ล: 70,
  ตรง: 500,
  ต: 100,
  ล3: 110,
};

/** รับเฉพาะประเภทที่ยังมีอยู่จริง และต้องเป็นตัวเลขเท่านั้น */
export function normalizeRates(raw: unknown): PayoutRates {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_RATES };
  for (const key of Object.keys(DEFAULT_RATES) as EntryType[]) {
    const value = Number(src[key]);
    if (Number.isFinite(value) && value >= 0) out[key] = value;
  }
  return out;
}
