-- ============================================================
--  คีย์เลข — ระบบตรวจรางวัล
--  วางทั้งไฟล์ลงใน Supabase Dashboard -> SQL Editor แล้วกด Run
--
--  รันซ้ำได้ไม่พัง และรันทับเวอร์ชันเก่าของไฟล์นี้ได้ด้วย
-- ============================================================

-- ------------------------------------------------------------
--  1) ประเภทที่อนุญาต
--     2 หลัก -> บ. / ล.      3 หลัก -> ตรง / ต. / ล.(3 ตัวล่าง)
--     ไม่รับรหัส 1 หลัก
-- ------------------------------------------------------------

alter table public.entries drop constraint if exists entries_code_format;
alter table public.entries
  add constraint entries_code_format check (code ~ '^[0-9]{2,3}$') not valid;

alter table public.entries drop constraint if exists entries_type_matches_code;
alter table public.entries
  add constraint entries_type_matches_code check (
    (length(code) = 2 and type in ('บ', 'ล')) or
    (length(code) = 3 and type in ('ตรง', 'ต', 'ล3'))
  ) not valid;

-- หมายเหตุ: ใช้ NOT VALID เพื่อไม่ให้คำสั่งล้มถ้าเผลอมีแถวเก่าที่ผิดกฎค้างอยู่
-- (แถวเก่าไม่ถูกลบทิ้ง แต่แถวใหม่ตั้งแต่นี้ไปจะถูกบังคับตามกฎ)

-- ------------------------------------------------------------
--  2) ผลรางวัลของแต่ละรอบ — แยกช่องตามจำนวนหลัก
-- ------------------------------------------------------------

create table if not exists public.round_results (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  round      text        not null,
  top2       text        not null default '',
  bottom2    text        not null default '',
  top3       text        not null default '',
  bottom3    text        not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, round)
);

-- เผื่อเคยรันไฟล์เวอร์ชันก่อนหน้าที่ยังไม่มีช่อง 2 ตัวบน
alter table public.round_results add column if not exists top2 text not null default '';

alter table public.round_results drop constraint if exists round_results_top2;
alter table public.round_results drop constraint if exists round_results_bottom2;
alter table public.round_results drop constraint if exists round_results_top3;
alter table public.round_results drop constraint if exists round_results_bottom3;

alter table public.round_results
  add constraint round_results_top2    check (top2    = '' or top2    ~ '^[0-9]{2}$'),
  add constraint round_results_bottom2 check (bottom2 = '' or bottom2 ~ '^[0-9]{2}$'),
  add constraint round_results_top3    check (top3    = '' or top3    ~ '^[0-9]{3}$'),
  add constraint round_results_bottom3 check (bottom3 = '' or bottom3 ~ '^[0-9]{3}$');

alter table public.round_results enable row level security;

drop policy if exists round_results_own on public.round_results;
create policy round_results_own on public.round_results
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ------------------------------------------------------------
--  3) อัตราจ่าย (หนึ่งชุดต่อหนึ่งบัญชี)
-- ------------------------------------------------------------

create table if not exists public.payout_rates (
  user_id    uuid        primary key default auth.uid() references auth.users (id) on delete cascade,
  rates      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.payout_rates enable row level security;

drop policy if exists payout_rates_own on public.payout_rates;
create policy payout_rates_own on public.payout_rates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
