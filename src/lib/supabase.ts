import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true เมื่อตั้งค่า env ครบ — ถ้าไม่ครบแอปจะวิ่งโหมดออฟไลน์ (localStorage) ให้อัตโนมัติ */
export const isCloud = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isCloud) throw new Error("ยังไม่ได้ตั้งค่า Supabase");
  if (!cached) {
    cached = createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return cached;
}
