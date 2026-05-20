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
- First practical local daily logging operator workflow boundary has been defined as setup, daily logging, confirmation/query, and cleanup/maintenance phases using existing local helpers only.
- First practical local daily logging operator workflow validation has passed end-to-end using `scripts/local/setup-references.js` and `scripts/local/manual-log.js`.
- Mobile-friendly local daily logging path boundary is documented as copy-ready operator command snippets using the existing local helpers.
- Mobile-friendly local daily logging command snippets validation has passed using the existing local helpers.
- Local alias/reference shortcut boundary is documented as the next mobile-friendly friction-reduction boundary; no alias implementation exists.
- Local alias/reference shortcut boundary validation has passed; no alias implementation exists.
- Backend local-complete criteria are documented for the local-only Finance backend/operator layer.
- Backend local-complete criteria validation has passed at the documentation/boundary level.
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

## First Practical Local Daily Logging Operator Workflow

This workflow is the first practical local operator path for daily logging. It uses the existing validated local helpers as separate steps and remains local-only.

It does not define App/API/Dashboard/Shortcut behavior, production or staging workflow, remote Supabase workflow, aliases, package wrappers, package scripts, seed files, automated recurring logging, reporting objects, AI, Projection, transfer or adjustment support, or legacy Sheets/GAS behavior.

### Setup Phase

Use `scripts/local/setup-references.js` with:

- Existing local owner context / `user_id`.
- Account display name.
- Account type.
- Income category display name.
- Expense category display name.
- Optional income or expense category grouping purpose.

The setup output should provide:

- Active account UUID and display name.
- Active income category UUID and display name.
- Active expense category UUID and display name.
- Created versus already-existing status.
- Same-owner confirmation.
- Active-state confirmation.
- Command-ready references for `scripts/local/manual-log.js`.

### Daily Logging Phase

Use `scripts/local/manual-log.js` with:

- `--date <YYYY-MM-DD>`.
- `--amount <positive-number>`.
- `--type <income|expense>`.
- `--account <account-uuid-from-setup>`.
- `--category <income-or-expense-category-uuid-from-setup>`.

Optional context fields:

- `--description <text>`.
- `--merchant-or-payee <text>`.
- `--payment-method <text>`.
- `--source-system-name <text>`.
- `--source-record-reference <text>`.

Use the income category UUID for income records and the expense category UUID for expense records. Transfer and adjustment remain out of scope.

### Confirmation/Query Phase

Minimum confirmation:

- Review the inserted row summary printed by `scripts/local/manual-log.js`.
- Query by date when issue scope includes query inspection.
- Query by account when issue scope includes query inspection.
- Query by category when issue scope includes query inspection.
- Query by `movement_type` when issue scope includes query inspection.

### Cleanup/Maintenance Phase

- Temporary validation data should be cleaned up when this workflow is used for validation.
- Persistent local operator references may remain if intentionally used for recurring local work.
- Inactive account/category references must not be selected for new logging.
- Duplicate active display-name ambiguity should stop and require a human decision.
- Generated local Supabase metadata should not be committed.

### Script Roles

`scripts/local/setup-references.js` creates or identifies account/category references, prints UUIDs and display names, prints created versus already-existing status, prints same-owner and active-state confirmation, and prints command-ready references for `scripts/local/manual-log.js`.

`scripts/local/setup-references.js` does not insert finance activities, replace `scripts/local/manual-log.js`, add aliases, use seed files, or touch production, staging, or remote Supabase.

`scripts/local/manual-log.js` inserts one local `finance_activities` record, uses UUID-first account/category references, supports income and expense only, defaults currency to `TWD`, defaults `source_indicator` to `manual`, and reports an inserted row summary.

`scripts/local/manual-log.js` does not create account/category references, support transfer or adjustment, or define App/API/Dashboard/Shortcut workflow.

### Minimum Operator Inputs

- Local owner user id.
- Account display name.
- Account type.
- Income category display name.
- Expense category display name.
- Activity date.
- Amount.
- Movement type.
- Account/category UUIDs.
- Optional note/context fields.

### Minimum Operator Outputs

- Command-ready account UUID.
- Command-ready income category UUID.
- Command-ready expense category UUID.
- Display names for human confirmation.
- Inserted activity summary.
- Query evidence when issue scope includes query inspection.
- Cleanup or maintenance status when validation data is used.

### What Remains Manual

- Choosing account/category display names.
- Choosing account type.
- Deciding whether references are persistent or temporary.
- Copying UUIDs into `scripts/local/manual-log.js` commands.
- Reviewing inserted activity summaries.
- Choosing cleanup behavior for validation data.
- Deciding how to handle duplicate active display-name ambiguity.

### Intentionally Deferred

- Aliases.
- Package wrapper or npm script.
- Apple Shortcut.
- App/API/Dashboard.
- Production or staging workflow.
- Remote Supabase.
- Seed files.
- Automated recurring logging.
- Transfer or adjustment support.
- Reporting objects.
- AI or Projection.
- Legacy Sheets/GAS.

## First Practical Local Daily Logging Operator Workflow Validation

Issue #84 validated the first practical local daily logging operator workflow end to end.

Static checks passed:

- `node --check scripts/local/setup-references.js`.
- `node --check scripts/local/manual-log.js`.

Setup phase passed:

- `scripts/local/setup-references.js` created command-ready account/category references.
- Active account UUID and display name were produced.
- Active income category UUID and display name were produced.
- Active expense category UUID and display name were produced.
- Same-owner confirmation passed.
- Active-state confirmation passed.

Daily logging phase passed:

- `scripts/local/manual-log.js` inserted one income activity using setup output UUIDs.
- `scripts/local/manual-log.js` inserted one expense activity using setup output UUIDs.

Confirmation/query phase passed:

- Query by date passed.
- Query by account passed.
- Query by income category passed.
- Query by expense category passed.
- Query by `movement_type` passed.
- Same-owner join evidence passed.

Cleanup/maintenance phase passed:

- Temporary activities were removed.
- Temporary account was removed.
- Temporary categories were removed.
- Temporary local auth owner was removed.
- Generated `supabase/.temp/` was removed.
- Generated `supabase/.branches/` was removed.
- Final working tree was clean.

Scope confirmation:

- No repo files were modified during validation.
- No code, scripts, wrappers, aliases, package scripts, seed files, migrations, schema changes, Supabase config changes, production access, remote Supabase linking, `service_role` key usage, App/API/Dashboard/Shortcut work, reporting objects, AI, Projection, legacy Sheets/GAS work, versioning, or production-ready claim was introduced.

## Mobile-Friendly Local Daily Logging Path Boundary

The first mobile-friendly local daily logging path is documented copy-ready operator command snippets.

This path reduces repeated typing while preserving the existing local-only workflow. `scripts/local/setup-references.js` and `scripts/local/manual-log.js` remain separate. UUID copying from setup output into manual logging commands remains explicit for now.

This path does not add aliases, wrappers, package scripts, Apple Shortcut implementation, App/API/Dashboard behavior, production or staging workflow, remote Supabase access, `service_role` usage, seed files, schema changes, migration changes, Supabase config changes, transfer or adjustment support, reporting objects, AI/Projection behavior, or legacy Sheets/GAS work.

### Setup Command Template

```powershell
node scripts/local/setup-references.js --user <local-owner-user-id> --account-name "<account-display-name>" --account-type <cash|bank|credit_card|stored_value|other> --income-category-name "<income-category-display-name>" --expense-category-name "<expense-category-display-name>" --income-grouping-purpose "income" --expense-grouping-purpose "expense"
```

Copy the printed account UUID, income category UUID, and expense category UUID into the daily logging commands.

### Income Command Template

```powershell
node scripts/local/manual-log.js --date <YYYY-MM-DD> --amount <positive-number> --type income --account <account-uuid-from-setup> --category <income-category-uuid-from-setup> --description "<optional-description>" --merchant-or-payee "<optional-merchant-or-payee>" --payment-method "<optional-payment-method>"
```

### Expense Command Template

```powershell
node scripts/local/manual-log.js --date <YYYY-MM-DD> --amount <positive-number> --type expense --account <account-uuid-from-setup> --category <expense-category-uuid-from-setup> --description "<optional-description>" --merchant-or-payee "<optional-merchant-or-payee>" --payment-method "<optional-payment-method>"
```

### Confirmation/Query Command Shape

When inspection is in scope, confirm local records by date, account, category, and `movement_type`.

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
  and account_id = '<account-uuid>'
  and category_id = '<category-uuid>'
  and movement_type = '<income|expense>'
order by created_at;
'@ | docker exec -i supabase_db_detabase psql --username postgres --dbname postgres --quiet --tuples-only --no-align
```

### Cleanup/Maintenance Reminder

- Temporary validation records should be cleaned up when snippets are used for validation.
- Persistent local operator references may remain only when intentionally used for recurring local work.
- Inactive references must not be selected for new logging.
- Duplicate active display-name ambiguity should stop and require a human decision.
- Generated local Supabase metadata should not be committed.

### Minimum Mobile/Operator Inputs

- Date.
- Amount.
- Movement type: income or expense.
- Account/category references from setup.
- Optional description.
- Optional merchant or payee.
- Optional payment method.

### Minimum Mobile/Operator Outputs

- Command-ready references.
- Inserted row summary.
- Query/confirmation result when inspection is in scope.
- Cleanup or maintenance status when validation data is used.

### What Can Remain Manual

- Selecting account/category names.
- Deciding whether references are persistent or temporary.
- Copying UUIDs.
- Choosing description, merchant/payee, and payment method.
- Deciding cleanup behavior.
- Checking inserted row summary.

### Deferred Items

- Aliases.
- Package scripts.
- Wrappers.
- Apple Shortcut implementation.
- App/API/Dashboard.
- Production or staging workflow.
- Remote Supabase.
- `service_role` usage.
- Seed files.
- Schema, migration, or Supabase config changes.
- Transfer or adjustment support.
- Reporting objects.
- AI or Projection behavior.
- Legacy Sheets/GAS work.

## Mobile-Friendly Local Daily Logging Command Snippet Validation

Issue #89 validated the documented copy-ready mobile/operator command snippets locally with the existing helpers only.

Validation confirmed:

- Setup command shape passed with `scripts/local/setup-references.js`.
- Income command shape passed with `scripts/local/manual-log.js`.
- Expense command shape passed with `scripts/local/manual-log.js`.
- Confirmation/query command shape returned expected rows by date, account, category, and `movement_type`.
- Cleanup/maintenance passed: temporary activities were removed, the temporary account was removed, temporary categories were removed, and the temporary auth owner was removed.
- Generated `supabase/.temp` and `supabase/.branches` metadata were removed.
- Final working tree was clean.

Scope confirmation:

- No repo files were modified during validation.
- No code, scripts, wrappers, aliases, package scripts, reusable tooling, seed files, migrations, schema changes, or Supabase config changes were introduced.
- No production access, remote Supabase linking, or `service_role` key usage occurred.
- No Apple Shortcut, App, API, Dashboard, reporting, AI, Projection, legacy Sheets/GAS, versioning, or production-ready claim was introduced.

## Local Alias/Reference Shortcut Boundary

Issue #92 recommended local alias/reference shortcut definition as the next mobile-friendly friction-reduction boundary after validated copy-ready command snippets.

This boundary is documentation-only. It does not implement aliases, wrappers, package scripts, reusable tooling, Apple Shortcut behavior, App/API/Dashboard behavior, production or staging workflow, remote Supabase behavior, seed files, schema changes, migration changes, or Supabase config changes.

Boundary rules:

- UUIDs remain the execution identifiers for account/category references.
- Aliases or reference shortcuts must not replace UUID-first execution integrity.
- If implemented later, aliases or reference shortcuts must resolve to exactly one same-owner active account/category UUID.
- Duplicate alias or display-name ambiguity must stop and require a human decision.
- Inactive references must not be selected for new logging.
- Cross-owner references must not be selected.
- Alias/reference shortcut behavior remains local-only.
- Alias/reference shortcut behavior must not introduce App/API/Dashboard/Shortcut, staging, production, remote Supabase, or `service_role` behavior.

Validation expectations before implementation:

- Existing setup references still work with `scripts/local/manual-log.js`.
- Any proposed shortcut maps to exactly one active same-owner account or category.
- Ambiguous duplicate active references stop safely.
- Inactive references are not selected for new logging.
- Cross-owner references are not selected.
- Resolved UUIDs can produce one income and one expense through `scripts/local/manual-log.js`.
- Query evidence can confirm records by date, account, category, and `movement_type`.
- Cleanup remains explicit for validation data.
- No production, remote Supabase, `service_role`, schema, migration, config, seed, App/API/Dashboard, Apple Shortcut, reporting, AI, Projection, or legacy Sheets/GAS work occurs.

Deferred scope:

- Package wrapper or npm script.
- Apple Shortcut implementation.
- App/API/Dashboard.
- Production or staging workflow.
- Remote Supabase.
- `service_role` usage.
- Seed files.
- Schema, migration, or Supabase config changes.
- Transfer or adjustment support.
- Reporting objects, views, functions, triggers, or reporting tables.
- AI or Projection behavior.
- Legacy Sheets/GAS work.

## Local Alias/Reference Shortcut Boundary Validation

Issue #95 validated the local alias/reference shortcut boundary at the documentation/boundary level.

Validation confirmed:

- UUID-first execution integrity remains preserved.
- Alias/reference shortcuts, if implemented later, must resolve to exactly one same-owner active account/category UUID.
- Duplicate alias or display-name ambiguity must stop and require a human decision.
- Inactive references must not be selected for new logging.
- Cross-owner references must not be selected.
- Existing setup and manual logging helpers remain separate: `scripts/local/setup-references.js` creates or identifies references, and `scripts/local/manual-log.js` inserts one local finance activity.

This validation did not require or introduce implementation, config, schema, migration, seed, production access, remote Supabase linking, `service_role` key usage, App/API/Dashboard work, Apple Shortcut work, reporting objects, AI, Projection, or legacy Sheets/GAS work.

## Backend Local-Complete Criteria

Backend local-complete means the local-only Finance backend/operator layer is sufficient for one personal operator to set up local references, log income and expense activities, inspect local records, and maintain cleanup discipline using existing local tools and docs.

Backend local-complete is not production-ready and does not define App, API, Dashboard, Apple Shortcut, alias, wrapper, package script, production, staging, remote Supabase, reporting, AI, Projection, or legacy Sheets/GAS completeness.

Required completed capabilities:

- Local schema/migration exists and was validated.
- Local replay/reset workflow was validated.
- `scripts/local/setup-references.js` exists and was validated.
- `scripts/local/manual-log.js` exists and was validated.
- Setup to logging to query to cleanup operator workflow was validated.
- Mobile-friendly command snippets were validated.
- Alias/reference shortcut boundary was documented and validated.
- Source-of-truth docs are synchronized.

Required validation evidence:

- `node --check scripts/local/setup-references.js` passed.
- `node --check scripts/local/manual-log.js` passed.
- Local Supabase DB startup, reset, or replay passed where validation issues allowed it.
- `scripts/local/setup-references.js` created or identified one active account, one active income category, and one active expense category.
- Helper reuse and dry-run behavior passed.
- `scripts/local/manual-log.js` inserted one income and one expense using helper output UUIDs.
- Required input validation passed for date, positive amount, income or expense type, account UUID, and category UUID.
- Optional field mapping passed where included.
- Same-owner integrity passed.
- Negative checks passed for invalid UUID, invalid account type, duplicate active ambiguity, inactive references, and cross-owner references where applicable.
- Query evidence passed by date, account, category, income category, expense category, and `movement_type` where applicable.
- Cleanup removed temporary activities, accounts, categories, temporary local auth users, and generated local Supabase metadata where applicable.
- Validation reports confirmed no production access, remote Supabase linking, `service_role`, schema/migration/config change, seed file, App/API/Dashboard/Apple Shortcut, reporting, AI, Projection, or legacy Sheets/GAS work occurred.

Acceptable remaining risks for personal local use:

- Terminal-based operation remains manual.
- UUID copying remains explicit.
- The operator chooses account/category display names and decides whether references are persistent or temporary.
- Local Docker and local Supabase availability are required.
- Cleanup requires operator discipline when validation data is used.
- No Apple Shortcut, App, API, Dashboard, wrapper, alias, or package script exists.
- Income and expense are supported; transfer and adjustment remain deferred.
- Query inspection is local and manual when needed.

Risks requiring future issues:

- Production or staging deployment.
- Remote Supabase linking or hosted database use.
- `service_role` usage.
- Production secrets handling, backup, restore, monitoring, and security review.
- App/API/Dashboard/Apple Shortcut UX and authorization boundaries.
- Alias/reference shortcut implementation and ambiguity handling.
- Package wrapper or command wrapper design.
- Transfer and adjustment support.
- Reporting, totals, or dashboard behavior.
- Durable reference setup strategy beyond the local helper behavior.
- Data retention, export, backup, and restore for real personal records.
- Any schema, migration, Supabase config, seed, or RLS policy change.

Explicit out-of-scope items after backend local-complete:

- Production.
- Remote Supabase.
- `service_role`.
- App/API/Dashboard/Apple Shortcut implementation.
- Package wrappers.
- Alias implementation.
- Seed files.
- Schema, migration, or Supabase config changes.
- Reporting objects, views, functions, triggers, tables, dashboards, or formal reporting behavior.
- AI or Projection behavior.
- Legacy Sheets/GAS work.
- Version labels.
- Production-ready claims.

## Backend Local-Complete Criteria Validation

Issue #101 validated the backend local-complete criteria at the documentation/boundary level.

Validation confirmed:

- Required completed capabilities are present.
- Required validation evidence is present.
- Backend local-complete remains separate from production-ready status.
- Backend local-complete remains separate from App/API/Dashboard/Apple Shortcut completeness.
- Acceptable remaining risks are documented.
- Future-issue risks are documented.
- Explicit out-of-scope items are documented.
- No repo files were modified during validation.
- No code, scripts, aliases, wrappers, package scripts, reusable tooling, migration, schema, config, seed, local Supabase validation, production, remote Supabase, `service_role`, Apple Shortcut, App/API/Dashboard, reporting, AI, Projection, legacy Sheets/GAS, versioning, or production-ready claim was introduced.

Recommended next issue after this validation sync: declare backend local-complete status.

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
