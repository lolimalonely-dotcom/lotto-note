import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** ตัดช่องว่างและเครื่องหมายคำพูดที่มักติดมาเวลาก๊อปค่าไปวางในหน้าตั้งค่า */
function clean(raw: string | undefined): string {
  return (raw ?? "").trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
}

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const anonKey = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function checkUrl(value: string): string | null {
  if (value === "") return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return value.startsWith("sb_") || value.startsWith("eyJ")
      ? "ช่อง NEXT_PUBLIC_SUPABASE_URL ถูกใส่เป็น \"คีย์\" ไม่ใช่ URL — ต้องเป็น https://xxxxx.supabase.co"
      : `NEXT_PUBLIC_SUPABASE_URL ไม่ใช่ URL ที่ถูกต้อง: "${value}"`;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return `NEXT_PUBLIC_SUPABASE_URL ต้องขึ้นต้นด้วย https:// (ตอนนี้เป็น ${parsed.protocol})`;
  }
  return null;
}

function checkKey(value: string): string | null {
  if (value === "") return null;
  if (/^https?:\/\//i.test(value)) {
    return "ช่อง NEXT_PUBLIC_SUPABASE_ANON_KEY ถูกใส่เป็น URL — ต้องเป็นคีย์ (ขึ้นต้นด้วย eyJ หรือ sb_publishable_)";
  }
  return null;
}

/**
 * ถ้าตั้งค่าผิด จะไม่ปล่อยให้แอปพังทั้งหน้า แต่ตกไปโหมดออฟไลน์
 * แล้วให้ UI เอาข้อความนี้ไปแสดงแทน
 */
export const configError: string | null =
  url === "" && anonKey === "" ? null : (checkUrl(url) ?? checkKey(anonKey));

/** true เมื่อตั้งค่า env ครบและถูกรูปแบบ — ถ้าไม่ครบแอปจะวิ่งโหมดออฟไลน์ (localStorage) */
export const isCloud = Boolean(url && anonKey && !configError);

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isCloud) throw new Error(configError ?? "ยังไม่ได้ตั้งค่า Supabase");
  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return cached;
}
