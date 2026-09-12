-- ============================================================
--  คีย์เลข — โครงฐานข้อมูล
--  วางทั้งไฟล์นี้ลงใน Supabase Dashboard -> SQL Editor แล้วกด Run
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists public.entries (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  round      text        not null,
  name       text        not null,
  code       text        not null,
  type       text        not null,
  amount     numeric(12, 2) not null,
  batch_id   text,
  created_at timestamptz not null default now(),

  constraint entries_code_format    check (code ~ '^[0-9]{2,3}$'),
  constraint entries_amount_positive check (amount > 0),
  constraint entries_name_not_blank check (btrim(name) <> ''),

  -- กฎหลัก: 2 หลักลงได้แค่ บ./ล. , 3 หลักลงได้แค่ ตรง/ต.
  constraint entries_type_matches_code check (
    (length(code) = 2 and type in ('บ', 'ล')) or
    (length(code) = 3 and type in ('ตรง', 'ต'))
  )
);

create index if not exists entries_user_round_idx      on public.entries (user_id, round);
create index if not exists entries_user_round_name_idx on public.entries (user_id, round, name);
create index if not exists entries_user_round_code_idx on public.entries (user_id, round, code);
create index if not exists entries_batch_idx           on public.entries (user_id, batch_id);

-- ------------------------------------------------------------
--  Row Level Security — แต่ละบัญชีเห็นเฉพาะข้อมูลของตัวเอง
-- ------------------------------------------------------------

alter table public.entries enable row level security;

drop policy if exists entries_select_own on public.entries;
create policy entries_select_own on public.entries
  for select using (auth.uid() = user_id);

drop policy if exists entries_insert_own on public.entries;
create policy entries_insert_own on public.entries
  for insert with check (auth.uid() = user_id);

drop policy if exists entries_update_own on public.entries;
create policy entries_update_own on public.entries
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists entries_delete_own on public.entries;
create policy entries_delete_own on public.entries
  for delete using (auth.uid() = user_id);
