# Runbook

## Purpose

This runbook records the current validated local tooling path for the Finance MVP.

It is local-only operating documentation. It is not production deployment documentation and does not define App, API, Dashboard, Apple Shortcut, AI, Projection, reporting, seed, or production workflow behavior.

## Current Status

- Local Finance MVP migration replay has been validated.
- Local Finance MVP insert/query and review-query behavior have been validated.
- `scripts/local/manual-log.js` exists as the first reusable local manual logging Node script.
- The reusable script has been validated for one income activity, one expense activity, and a minimal local daily logging loop.
- Local account/category setup workflow has been validated with temporary local references for one income activity and one expense activity.
- Persistent local account/category setup runbook boundary validation has passed with one active account, one active income category, and one active expense category.
- `scripts/local/setup-references.js` exists as the reusable local account/category setup helper.
- Reusable local account/category setup helper validation has passed for create, reuse, dry-run, negative checks, manual-log compatibility, query evidence, and cleanup.
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

## Account And Category Reference Setup Boundary

Local account/category setup is prerequisite reference data for `scripts/local/manual-log.js`.

This boundary is local-only. It is not formal onboarding, seed data, reusable setup tooling, App/API/Dashboard/Shortcut behavior, production workflow, or remote Supabase workflow.

Local accounts should:

- Use the same local owner context as daily logging.
- Be active when used for new manual logging.
- Stay limited to existing Finance MVP schema fields.
- Include `user_id`, `display_name`, `account_type`, `is_active = true`, and `id` as the stable UUID reference.

Local categories should:

- Use the same local owner context as activities and accounts.
- Include at least one active income category and one active expense category before stable local daily logging.
- Stay single-level.
- Include `user_id`, `display_name`, `is_active = true`, `id` as the stable UUID reference, and optional `grouping_purpose`.

For manual logging execution, use UUIDs as the first account/category identifiers. Display names are human-readable confirmation only. Local alias support is deferred to a future dedicated issue.

Future validation should confirm that selected active account/category UUIDs belong to the same `user_id` as activity records, can be used by `scripts/local/manual-log.js` for one income and one expense record, remain queryable by date/account/category/`movement_type`, and leave no durable temporary validation data unless explicitly approved.

Issue #64 validated this boundary with temporary local references. The validation confirmed that one active local account, one active income category, and one active expense category can support one income and one expense through `scripts/local/manual-log.js`; same-owner reference integrity passed; inactive account, inactive category, and cross-owner category checks failed as expected; records remained queryable by date, account, category, and `movement_type`; and cleanup removed temporary accounts, categories, and activities.

This validation did not introduce seed files, reusable setup tooling, App/API/Dashboard/Shortcut behavior, reporting objects, AI, Projection, production access, remote Supabase linking, `service_role` key usage, migration changes, schema changes, or Supabase config changes.

## Persistent Local Account And Category Setup Method Boundary

The first persistent local account/category setup method boundary is documented runbook manual steps.

This method is local-only and prepares reference data for `scripts/local/manual-log.js`. It is not onboarding, production workflow, App/API/Dashboard/Shortcut behavior, seed data, or reusable setup tooling.

Use UUIDs as execution identifiers for account/category references. Use display names as human-readable confirmation only. Local aliases remain deferred to a future dedicated issue.

One-off SQL is not the recurring setup method; it remains validation-only or explicitly allowed issue work. A reusable local helper script remains deferred. Seed-like setup is rejected for now.

Minimum setup inputs:

- Local owner context / `user_id`.
- Account `display_name`.
- Account `account_type`.
- Account `is_active = true`.
- Category `display_name`.
- Category `is_active = true`.
- Optional category `grouping_purpose`.

Minimum setup outputs:

- Active account UUID.
- Active income category UUID.
- Active expense category UUID.
- Display names for human confirmation.
- Evidence that selected account/category references belong to the same local owner context.

Before any implementation or helper tooling is considered, validation should confirm that one active account, one active income category, and one active expense category are available; `scripts/local/manual-log.js` can use those UUIDs for one income and one expense; same-owner integrity passes; inactive and cross-owner references are rejected; records remain queryable by date/account/category/`movement_type`; and cleanup removes temporary validation data.

Issue #70 validated this runbook boundary with temporary local references. The validation confirmed that documented manual setup steps can support one active account, one active income category, and one active expense category; `scripts/local/manual-log.js` inserted one income and one expense; same-owner integrity passed; inactive account, inactive category, and cross-owner category checks failed as expected; query evidence passed by date, account, income category, expense category, and `movement_type`; and cleanup removed temporary accounts, categories, and activities.

This validation did not introduce repo file changes, code, scripts, reusable setup tooling, seed files, App/API/Dashboard/Shortcut behavior, reporting objects, AI, Projection, production access, remote Supabase linking, `service_role` key usage, migration changes, schema changes, Supabase config changes, legacy Sheets/GAS work, versioning, or production-ready claims.

## Reusable Local Account And Category Setup Helper Boundary

The reusable local account/category setup helper exists at `scripts/local/setup-references.js`.

The helper is local-only and limited to account/category reference setup for `scripts/local/manual-log.js`. It can create or identify one active local account, one active income category, and one active expense category; ensure the selected references belong to the same local owner context; and print UUIDs plus display names for manual logging.

The helper must use UUID-first execution identifiers, keep display names as human confirmation only, avoid local aliases for now, and stay limited to account/category reference setup.

The helper must not insert finance activities, replace `scripts/local/manual-log.js`, add aliases, add seed files, modify migrations, schema, or Supabase config, add App/API/Dashboard/Shortcut behavior, or add staging, production, or remote Supabase behavior.

Boundary-level inputs:

- Local owner context / `user_id`.
- Account display name.
- Account type.
- Income category display name.
- Expense category display name.
- Optional category grouping purpose.
- Optional dry-run flag if useful.

Boundary-level outputs:

- Active account UUID and display name.
- Active income category UUID and display name.
- Active expense category UUID and display name.
- Same-owner confirmation.
- Active-state confirmation.
- Created versus already-existing status.
- Command-ready references for `scripts/local/manual-log.js`.

The implementation uses `scripts/local/setup-references.js`. Keep `package.json`, SQL migrations, Supabase config, seed files, App/API/Dashboard/Shortcut files, and reporting objects out of scope unless separately approved.

Issue #78 validated the helper locally. The validation confirmed `node --check scripts/local/setup-references.js` passed; create behavior produced one active local account, one active income category, and one active expense category; reuse behavior returned already-existing references; dry-run reported would-create and made no writes; helper output UUIDs worked with `scripts/local/manual-log.js` for one income and one expense; invalid UUID, invalid account type, duplicate active account ambiguity, duplicate active category ambiguity, inactive refs, and cross-owner refs were rejected or not selected as expected; query evidence passed for same-owner refs, date, account, income category, expense category, and `movement_type`; and cleanup removed temporary accounts, categories, activities, and local auth users.

This validation did not modify repo files or introduce code changes, scripts, reusable tooling, seed files, App/API/Dashboard/Shortcut behavior, reporting objects, AI, Projection, production access, remote Supabase linking, `service_role` key usage, migration changes, schema changes, Supabase config changes, legacy Sheets/GAS work, versioning, or production-ready claims.

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
