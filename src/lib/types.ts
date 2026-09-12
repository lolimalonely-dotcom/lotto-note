/** ประเภทการแทง — 2 หลักได้แค่ บ./ล. , 3 หลักได้แค่ ตรง/ต. */
export type EntryType = "ตรง" | "บ" | "ล" | "ต";

export interface Entry {
  id: string;
  round: string;
  name: string;
  code: string;
  type: EntryType;
  amount: number;
  /** จัดกลุ่มบรรทัดที่เกิดจากการกดบันทึกครั้งเดียว ใช้สำหรับ "เลิกทำ" */
  batchId: string;
  createdAt: string;
}

/** แถวที่ parser ผลิตออกมา ยังไม่มี id / งวด / ชื่อรายการ */
export interface DraftRow {
  code: string;
  type: EntryType;
  amount: number;
}
