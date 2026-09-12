/**
 * ประเภทการแทง — จำนวนหลักของรหัสเป็นตัวกำหนดว่าเลือกอะไรได้บ้าง
 *   1 หลัก : วบ (วิ่งบน) · วล (วิ่งล่าง)
 *   2 หลัก : บ (2 ตัวบน) · ล (2 ตัวล่าง)
 *   3 หลัก : ตรง (3 ตัวบน) · ต (โต๊ด) · ล3 (3 ตัวล่าง)
 */
export type EntryType = "วบ" | "วล" | "บ" | "ล" | "ตรง" | "ต" | "ล3";

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
  /** 3 ตัวบน (3 หลักท้ายของรางวัลที่ 1) */
  top3: string;
  /** 2 ตัวล่าง */
  bottom2: string;
  /** 3 ตัวล่าง */
  bottom3: string;
}

export const EMPTY_RESULT: DrawResult = { top3: "", bottom2: "", bottom3: "" };

/** อัตราจ่าย — แทง 1 บาท ถูกแล้วได้กี่บาท */
export type PayoutRates = Record<EntryType, number>;

export const DEFAULT_RATES: PayoutRates = {
  วบ: 3,
  วล: 4,
  บ: 70,
  ล: 70,
  ตรง: 500,
  ต: 100,
  ล3: 110,
};
