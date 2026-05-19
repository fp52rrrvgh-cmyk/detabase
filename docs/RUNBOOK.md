# Runbook

## Purpose

This runbook records the current validated local tooling path for the Finance MVP.

It is local-only operating documentation. It is not production deployment documentation and does not define App, API, Dashboard, Apple Shortcut, AI, Projection, reporting, seed, or production workflow behavior.

## Current Status

- Local Finance MVP migration replay has been validated.
- Local Finance MVP insert/query and review-query behavior have been validated.
- `scripts/local/manual-log.js` exists as the first reusable local manual logging Node script.
- The reusable script has been validated for one income activity, one expense activity, and a minimal local daily logging loop.
- Production remains untouched.

## Local Environment Prerequisites

- Docker must be available and running.
- Supabase CLI must be available.
- Node must be available.
- Local Supabase DB port is `55432`, as configured in `supabase/config.toml`.
- Work from GitHub `main` or an approved branch based on `main`.

## Scope Boundaries

- Local-only.
- No production database access.
- No `service_role` key usage.
- No remote Supabase linking.
- No App, API, Dashboard, or Apple Shortcut work.
- No seed files.
- No reporting objects, views, functions, triggers, or reporting tables.
- No AI or Projection behavior.
- No transfer or adjustment support in reusable local logging unless a dedicated issue explicitly approves it.

## Start Local Supabase Safely

Use the existing local Supabase config. Do not link a remote project.

Preferred DB-only startup when validating Finance MVP local database behavior:

```powershell
C:\Users\janzo\scoop\shims\supabase.exe start -x gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
```

This starts the local database path needed by the current reusable logging script.

## Reset Or Replay Local Migrations

Use local reset/replay only when an issue explicitly allows local validation or replay work.

```powershell
C:\Users\janzo\scoop\shims\supabase.exe db reset --local --no-seed
```

This must remain local-only. Do not run linked or remote reset commands.

## Log One Local Income Or Expense Record

`scripts/local/manual-log.js` inserts one local `finance_activities` row through the local Supabase Postgres Docker container.

Required inputs:

- `--date <YYYY-MM-DD>`
- `--amount <positive-number>`
- `--type <income|expense>`
- `--account <uuid>`
- `--category <uuid>`

Optional inputs:

- `--description <text>`
- `--merchant-or-payee <text>`
- `--payment-method <text>`
- `--source-system-name <text>`
- `--source-record-reference <text>`

Example shape:

```powershell
node scripts/local/manual-log.js --date 2026-05-20 --amount 100 --type expense --account <account-uuid> --category <category-uuid> --description "Local note"
```

Current script behavior:

- Supports income and expense only.
- Defaults currency to `TWD`.
- Defaults `source_indicator` to `manual`.
- Requires active same-owner account and category references.
- Reports an inserted row summary.

## Verify Local Records

Use local SQL only when an issue explicitly allows validation or inspection.

Example query shape:

```powershell
@'
select
  activity_date,
  account_id,
  category_id,
  movement_type,
  amount,
  currency,
  source_indicator
from public.finance_activities
where activity_date = '<YYYY-MM-DD>'
order by created_at;
'@ | docker exec -i supabase_db_detabase psql --username postgres --dbname postgres --quiet --tuples-only --no-align
```

Validated query dimensions:

- Date.
- Account.
- Category.
- `movement_type`.

## Cleanup Expectations

- Temporary local validation records should be cleaned up before finishing validation work.
- Cleanup can use transaction rollback, deleting the temporary local auth user when cascade behavior applies, or local reset when explicitly allowed by the issue.
- Generated local Supabase CLI metadata such as `supabase/.temp/` or `supabase/.branches/` should not be committed.
- Final working tree should be clean except for files explicitly allowed by the current issue.

## Stop Local Supabase

Stop local Supabase after local validation or runbook exercise work:

```powershell
C:\Users\janzo\scoop\shims\supabase.exe stop
```

## Troubleshooting

### Local Port Issue

The local DB port is configured as `55432` to avoid the Windows excluded port range that blocked the default Supabase local DB port.

If local startup fails with a port binding error:

- Check whether the configured port is occupied.
- Check Windows excluded port ranges.
- Do not modify `supabase/config.toml` unless a dedicated issue explicitly allows it.

### Non-DB Service Startup Failure

If non-DB Supabase services fail but the task only needs local database behavior, use the documented DB-only startup command above.

Do not broaden scope into Supabase config changes, remote linking, production access, or service changes without explicit approval.

## Checks

- Documentation-only changes do not require application runtime checks.
- JavaScript changes require `node --check`, but this runbook consolidation does not change JavaScript.
