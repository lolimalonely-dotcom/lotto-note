/**
 * สร้างเลขกลับทั้งหมดจากรหัสที่ให้มา (permutation ของหลักทุกตัว ไม่ซ้ำกัน)
 *   "123" -> 123 132 213 231 312 321
 *   "112" -> 112 121 211
 *   "12"  -> 12 21
 *   "11"  -> 11
 * เรียงจากน้อยไปมาก
 */
export function permutations(code: string): string[] {
  const out = new Set<string>();

  const build = (prefix: string, rest: string[]) => {
    if (rest.length === 0) {
      out.add(prefix);
      return;
    }
    const used = new Set<string>();
    for (let i = 0; i < rest.length; i++) {
      const d = rest[i];
      if (used.has(d)) continue; // กันซ้ำเมื่อมีหลักเหมือนกัน
      used.add(d);
      build(prefix + d, [...rest.slice(0, i), ...rest.slice(i + 1)]);
    }
  };

  build("", code.split(""));
  return [...out].sort(); // ความยาวเท่ากัน เรียงสตริง = เรียงตัวเลข
}
