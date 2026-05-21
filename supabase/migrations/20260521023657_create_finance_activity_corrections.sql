-- Finance activity correction events.
-- Initial scope: expense-only void correction events.
-- This migration preserves original finance_activities rows for audit trace.
-- It does not implement Edge Function behavior, WebApp correction UI, active review filtering, seed data, or production workflow.

alter table public.finance_activities
  add constraint finance_activities_user_id_id_movement_type_key
  unique (user_id, id, movement_type);

create table public.finance_activity_corrections (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  correction_type text not null,
  reason text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  activity_movement_type text generated always as ('expense'::text) stored,

  constraint finance_activity_corrections_type_check
    check (correction_type = 'void'),

  constraint finance_activity_corrections_reason_not_blank_check
    check (length(btrim(reason)) > 0),

  constraint finance_activity_corrections_created_by_owner_check
    check (created_by = owner_user_id),

  constraint finance_activity_corrections_expense_activity_fk
    foreign key (owner_user_id, activity_id, activity_movement_type)
    references public.finance_activities(user_id, id, movement_type)
);

create unique index finance_activity_corrections_one_void_per_activity_idx
  on public.finance_activity_corrections (activity_id)
  where correction_type = 'void';

create index finance_activity_corrections_owner_activity_idx
  on public.finance_activity_corrections (owner_user_id, activity_id);

create index finance_activity_corrections_activity_id_idx
  on public.finance_activity_corrections (activity_id);

create index finance_activity_corrections_owner_type_activity_idx
  on public.finance_activity_corrections (owner_user_id, correction_type, activity_id);

alter table public.finance_activity_corrections enable row level security;

grant select on public.finance_activity_corrections to authenticated;

create policy "Users read own finance activity corrections"
  on public.finance_activity_corrections
  for select
  to authenticated
  using (owner_user_id = auth.uid());
