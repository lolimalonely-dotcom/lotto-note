-- ============================================================
--  คีย์เลข — เพิ่มระบบตรวจรางวัล
--  วางทั้งไฟล์นี้ลงใน Supabase Dashboard -> SQL Editor แล้วกด Run
--  (รันซ้ำได้ ไม่พัง)
-- ============================================================

-- ------------------------------------------------------------
--  1) เปิดรับประเภทใหม่: เลขวิ่ง (1 หลัก) และ 3 ตัวล่าง
-- ------------------------------------------------------------

alter table public.entries drop constraint if exists entries_code_format;
alter table public.entries
  add constraint entries_code_format check (code ~ '^[0-9]{1,3}$');

alter table public.entries drop constraint if exists entries_type_matches_code;
alter table public.entries
  add constraint entries_type_matches_code check (
    (length(code) = 1 and type in ('วบ', 'วล')) or
    (length(code) = 2 and type in ('บ', 'ล')) or
    (length(code) = 3 and type in ('ตรง', 'ต', 'ล3'))
  );

-- ------------------------------------------------------------
--  2) ผลรางวัลของแต่ละรอบ
-- ------------------------------------------------------------

create table if not exists public.round_results (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  round      text        not null,
  top3       text        not null default '',
  bottom2    text        not null default '',
  bottom3    text        not null default '',
  updated_at timestamptz not null default now(),

  primary key (user_id, round),
  constraint round_results_top3    check (top3    = '' or top3    ~ '^[0-9]{3}$'),
  constraint round_results_bottom2 check (bottom2 = '' or bottom2 ~ '^[0-9]{2}$'),
  constraint round_results_bottom3 check (bottom3 = '' or bottom3 ~ '^[0-9]{3}$')
);

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
