-- Narrow RPC for expense activity void correction creation.
-- This keeps correction_type server/database-owned and preserves the original activity row.
-- Direct client writes to finance_activity_corrections remain blocked.

create or replace function public.void_finance_activity(
  p_activity_id uuid,
  p_reason text
)
returns table (
  ok boolean,
  code text
)
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
  v_caller_user_id uuid := auth.uid();
  v_reason text := btrim(coalesce(p_reason, ''));
  v_activity_movement_type text;
begin
  if v_caller_user_id is null then
    return query select false, 'not_authenticated';
    return;
  end if;

  if p_activity_id is null then
    return query select false, 'invalid_activity_reference';
    return;
  end if;

  if v_reason = '' then
    return query select false, 'invalid_reason';
    return;
  end if;

  select finance_activities.movement_type
    into v_activity_movement_type
  from public.finance_activities
  where finance_activities.id = p_activity_id
    and finance_activities.user_id = v_caller_user_id
  limit 1;

  if not found then
    return query select false, 'activity_not_found';
    return;
  end if;

  if v_activity_movement_type <> 'expense' then
    return query select false, 'activity_not_expense';
    return;
  end if;

  if exists (
    select 1
    from public.finance_activity_corrections
    where finance_activity_corrections.activity_id = p_activity_id
      and finance_activity_corrections.owner_user_id = v_caller_user_id
      and finance_activity_corrections.correction_type = 'void'
  ) then
    return query select false, 'activity_already_voided';
    return;
  end if;

  insert into public.finance_activity_corrections (
    activity_id,
    owner_user_id,
    correction_type,
    reason,
    created_by
  )
  values (
    p_activity_id,
    v_caller_user_id,
    'void',
    v_reason,
    v_caller_user_id
  );

  return query select true, 'void_created';
  return;
exception
  when unique_violation then
    return query select false, 'activity_already_voided';
    return;
  when foreign_key_violation then
    return query select false, 'activity_not_found';
    return;
  when check_violation then
    return query select false, 'void_not_allowed';
    return;
end;
$$;

revoke all on table public.finance_activity_corrections from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.finance_activity_corrections from authenticated;
grant select on table public.finance_activity_corrections to authenticated;

revoke all on function public.void_finance_activity(uuid, text) from public;
revoke all on function public.void_finance_activity(uuid, text) from anon;
grant execute on function public.void_finance_activity(uuid, text) to authenticated;
