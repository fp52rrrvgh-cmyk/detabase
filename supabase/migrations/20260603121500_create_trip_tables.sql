-- Migration: Add trip management tables (trips + freight)
-- Part of: 個人作戰系統 — 車趟模組

-- 車趟記錄
create table if not exists public.trips (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  client     text not null,
  origin     text not null,
  dest       text not null,
  note       text default '',
  fuel       bigint default 0,
  created_at timestamptz not null default now()
);

-- 運費記錄（老闆娘手寫 → 歸入對應車趟日期的運費）
create table if not exists public.freight (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  amount     bigint not null,
  created_at timestamptz not null default now()
);

-- 啟用 RLS
alter table public.trips enable row level security;
alter table public.freight enable row level security;

-- RLS policies
create policy "Users can view own trips"
  on public.trips for select
  using (auth.uid() = user_id);

create policy "Users can insert own trips"
  on public.trips for insert
  with check (auth.uid() = user_id);

create policy "Users can update own trips"
  on public.trips for update
  using (auth.uid() = user_id);

create policy "Users can view own freight"
  on public.freight for select
  using (auth.uid() = user_id);

create policy "Users can insert own freight"
  on public.freight for insert
  with check (auth.uid() = user_id);

-- GRANT to authenticated
grant select, insert, update on public.trips to authenticated;
grant select, insert on public.freight to authenticated;

-- GRANT to service_role (for Edge Functions)
grant select, insert, update on public.trips to service_role;
grant select, insert on public.freight to service_role;
