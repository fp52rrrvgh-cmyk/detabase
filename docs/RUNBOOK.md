# Runbook

## Purpose

This runbook records the current validated local tooling path, the approved staging-oriented WebApp boundary, and the implemented read-only Dashboard/reporting review panel boundary for the Finance MVP.

It is not production deployment documentation and does not implement write-capable Dashboard behavior, Apple Shortcut, AI, Projection, reporting objects, seed, or production workflow behavior.

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
- Backend local-complete status is declared for the local-only Finance backend/operator baseline.
- Hosted backend baseline validation has passed on `detabase-staging`.
- Minimal mobile ingestion API boundary is documented after Issue #115 as docs-only API boundary documentation.
- PR #139 merged the minimal Next.js App Router TypeScript WebApp under `apps/web`.
- Issue #138 is completed after implementing one mobile-first expense-entry page for the WebApp MVP.
- PR #139 validation passed `npm install`, `npm run build`, and `git diff --cached --check`.
- Issue #143 completed Next.js WebApp MVP staging runtime validation.
- Issue #152 completed staging default finance account reference preparation and resolved `invalid_account_reference`.
- Authenticated browser expense submit passed against `detabase-staging`.
- `log-finance-activity` accepted the WebApp request and inserted a staging `finance_activities` expense.
- WebApp runtime values remain local-only in `apps/web/.env.local` and must not be committed.
- PR #157 merged the WebApp runtime readiness and safe reference guidance implementation after Issue #156.
- Runtime readiness displays approved env names and configured/missing state only; it does not display runtime values.
- Safe guidance covers `invalid_account_reference`, `invalid_category_reference`, and `category_movement_mismatch`.
- The existing expense request payload shape remains unchanged.
- Browser validation passed with safe evidence after PR #157.
- PR #162 merged the WebApp post-submit ready state and repeat-entry flow implementation after Issue #161.
- Success messages now include a ready-for-next-expense cue while keeping the safe summary limited to date, TWD amount, and description.
- Amount and description reset after successful submit.
- Stale success and failure messages clear when the next entry starts.
- First-submit and second-submit browser validation passed with safe evidence.
- The WebApp remains expense-only and still does not send `source_indicator`.
- The first Finance Dashboard/reporting MVP boundary is documented as staging-only, read-only inspection of existing Finance MVP records.
- PR #176 merged the first Dashboard/reporting MVP implementation inside the existing `apps/web` WebApp after Issue #175.
- The implemented review panel is staging-only, read-only, and uses direct Supabase browser reads with an authenticated user session, publishable-key-compatible access, and RLS-owned rows only.
- The review panel reads existing Finance MVP tables only: `finance_activities`, `finance_accounts`, and `finance_categories`.
- The review panel supports recent owned activities, date range filtering, movement type filtering, totals by selected range, totals by `movement_type`, totals by category, and totals by account.
- Review validation passed with safe evidence and performed no writes.
- The existing expense submit payload remains unchanged, and `apps/web/.env.local` remains local-only and uncommitted.
- WebApp TWD amount input is positive whole-number only; decimal, zero, negative, blank, or invalid amounts are rejected.
- The read-only review panel displays TWD activity amounts and totals without decimal places.
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
- No broader App, write-capable Dashboard implementation, separate Dashboard app, or Apple Shortcut work beyond the approved `apps/web` WebApp MVP and implemented read-only review panel boundary.
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

Completed next issue after this validation sync: backend local-complete status declaration.

## Backend Local-Complete Status

Backend local-complete status is declared for the local-only Finance backend/operator baseline.

This status means the current local backend/operator path is sufficient for one personal operator to set up local references, log income and expense activities, inspect local records, and maintain cleanup discipline with existing local tools and source-of-truth docs.

This is not production-ready. It does not include production, staging, deployment, remote Supabase, `service_role`, App/API/Dashboard/Apple Shortcut implementation, alias implementation, wrappers, package scripts, seed files, reporting objects, AI, Projection, or legacy Sheets/GAS work.

This declaration introduces no code, scripts, aliases, wrappers, package scripts, new reusable tooling, migration, schema, config, seed, validation, staging, production, deployment, remote Supabase, `service_role`, Apple Shortcut, App/API/Dashboard, reporting, AI, Projection, legacy Sheets/GAS, versioning, or production-ready claim.

Completed boundary:

- Local schema/migration and replay/reset evidence are validated.
- `scripts/local/setup-references.js` is implemented and validated.
- `scripts/local/manual-log.js` is implemented and validated.
- Setup to logging to query to cleanup operator workflow is validated.
- Mobile-friendly command snippets are validated.
- Alias/reference shortcut boundary is documented and validated, with no alias implementation.
- Source-of-truth docs are synchronized.

Incomplete boundary:

- Production/staging/deployment/remote Supabase.
- `service_role`.
- App/API/Dashboard/Apple Shortcut completeness.
- Alias implementation.
- Wrappers and package scripts.
- New reusable tooling beyond existing validated local scripts.
- Seed files.
- Reporting objects.
- Schema, migration, or Supabase config changes.
- Transfer or adjustment support.
- AI or Projection.
- Legacy Sheets/GAS.
- Version labels or production-ready claims.

Acceptable remaining local-use risks:

- Manual terminal operation.
- Explicit UUID copying.
- Operator-selected account/category names and persistence choices.
- Local Docker/Supabase dependency.
- Manual cleanup discipline when validation data is used.
- Income/expense-only logging.

Future-phase risks require dedicated issues before work starts.

Completed next issue after this declaration: post-backend local-complete transition boundary was defined before staging connection policy work.

## Staging Supabase Environment Connection Rules

Issue #108 defined staging Supabase environment connection preparation as policy/operator-boundary work only.

Preparing the staging environment connection means defining what information an operator must have ready, how that information is handled, and what evidence is required before any hosted action occurs. It does not mean creating, connecting, modifying, validating, or applying migrations to a hosted Supabase project.

This policy exists after backend local-complete declaration and after staging was selected as the first hosted backend validation boundary. Production remains untouched.

### Allowed Repo Documentation Content

Repo files may document only non-secret staging preparation content:

- Non-secret setup steps.
- Environment variable names or placeholders without values.
- Required operator confirmations.
- Stop conditions.
- Validation checklist items.
- Safe evidence expectations.

### Values That Must Stay Out Of Repo And GitHub Text

Secret values and access-granting values must stay outside repo files, issues, PRs, logs, and docs.

Do not record:

- Database connection strings.
- API keys.
- Access tokens.
- Dashboard credentials.
- Passwords.
- Copied hosted dashboard credentials.
- Private URLs that expose access.
- Hosted project identifiers when they are sensitive in context.
- Any value that grants access.

### Stop Conditions

Stop before any staging connection, verification, migration, or hosted action if any of these occur:

- Required operator values are missing.
- The staging target is unclear.
- The target could be production.
- Production ambiguity exists.
- A request asks to expose or record credentials.
- Privileged access is needed but not explicitly approved.
- A destructive or irreversible action would be required.
- Scope expands into migration application, Supabase config changes, production access, App/API/Dashboard/Apple Shortcut code, aliases, wrappers, package scripts, reusable tooling, seed files, reporting objects, AI, Projection, transfer or adjustment support, or legacy Sheets/GAS work.

### Evidence Required Before Applying Existing Migrations To Staging

Before a future issue may apply existing migrations to staging, safe evidence must show:

- The staging target is clearly identified by the operator without recording secret or access-granting values.
- Production exclusion is explicitly confirmed.
- Credential handling rules are documented.
- The connection method is bounded by a dedicated staging-only issue.
- The safe evidence format is defined.
- Rollback, reset, or cleanup expectations are known.

### Next Safe Step

The next smallest safe issue after WebApp repeat-entry flow is to define the next bounded WebApp step.

## Minimal Mobile Ingestion API Boundary

Issue #115 recommended a dedicated Supabase Edge Function as the minimal mobile ingestion boundary after hosted backend baseline validation passed on `detabase-staging`.

This runbook records policy and operator boundary only. It does not implement an Edge Function, Apple Shortcut, App, API route, Dashboard, deployment, production workflow, schema change, migration change, Supabase config change, seed data, durable personal data, alias, wrapper, package script, reporting object, AI, Projection, transfer/adjustment support, or legacy Sheets/GAS behavior.

### Recommended Path

The recommended primary path is:

```text
iPhone Shortcut later -> dedicated Supabase Edge Function -> existing Finance tables in detabase-staging
```

Direct client insert is not the first recommended path because the mobile client should not own broad database-facing responsibility, credential handling, authorization decisions, or validation rules.

Local script reuse is not the first recommended mobile path because the existing local scripts remain local operator tools and do not provide hosted iPhone or Shortcut ingestion.

Dashboard-first input is not the first recommended path because it expands UI and reporting scope before minimal mobile ingestion is proven.

### Minimal Request Shape

One future ingestion request should represent one income or expense record.

Required fields:

- `activity_date`.
- `movement_type` as `income` or `expense`.
- Positive `amount`.
- `account_id` as UUID.
- `category_id` as UUID.

Optional fields:

- `currency`, default or expected `TWD` if omitted by a future implementation.
- `description`.
- `merchant_or_payee`.
- `payment_method`.
- `source_system_name`.
- `source_record_reference`.

### Minimum Validation Rules

- Accept income and expense only.
- Reject non-positive amounts.
- Require UUID-shaped account and category references.
- Require selected account and category references to be active.
- Require selected account and category references to belong to the same owner/auth boundary.
- Require category to match the requested movement type.
- Keep transfer and adjustment out of scope.
- Handle unknown or unsupported fields only through an explicit future implementation decision.

### Authentication And Authorization Boundary

- Authentication and authorization remain policy-level in this documentation step.
- A future Edge Function must not require Apple Shortcut to hold broad database credentials.
- A future Edge Function should resolve caller/operator identity through a bounded auth mechanism before writing.
- `service_role` must not be exposed to the client.
- Production remains out of scope.

### Account And Category References

- UUID-first account/category references remain required for execution.
- Display names may be used for human confirmation later, not as execution identifiers.
- Alias behavior remains out of scope until a later dedicated issue explicitly approves it.

### Safe Responses

A safe success response may include success status, inserted activity id, movement type, date, amount, safe account/category confirmation fields, and validation source.

A safe failure response may include a safe error code and human-readable message.

Responses must not expose credentials, SQL internals, connection details, private URLs, or access-granting values.

### Deferred Scope

- Edge Function implementation.
- Apple Shortcut implementation.
- App/API/Dashboard code.
- Deployment, staging promotion, or production behavior.
- Supabase config changes.
- Schema or migration changes.
- Seed data or durable personal data.
- Credential disclosure.
- Aliases, wrappers, package scripts, or new reusable tooling.
- Reporting objects.
- AI or Projection behavior.
- Transfer or adjustment support.
- Legacy Sheets/GAS work.
- Version labels.
- Production-ready claims.

## Next.js WebApp MVP Expense Entry

PR #139 merged the minimal Next.js App Router TypeScript WebApp under `apps/web`.

Issue #138 completed with one mobile-first expense-entry page. The page includes amount input, description input, submit button, loading state, safe success message, and safe failure message.

The WebApp sends one expense-shaped request to the existing `log-finance-activity` Edge Function boundary when runtime configuration and a browser session are available.

Request behavior:

- `activity_date` defaults to the current local date in `YYYY-MM-DD`.
- `movement_type` is `expense`.
- `currency` is `TWD`.
- `amount` and `description` come from the operator inputs.
- Account and category references come from approved runtime env names.
- `source_indicator` is not sent because the current Edge Function allowed-field list does not include it.

Runtime environment names are documented without values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_FINANCE_FUNCTION_URL`
- `NEXT_PUBLIC_DEFAULT_EXPENSE_ACCOUNT_ID`
- `NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID`

Validation recorded during PR #139:

- `npm install` passed inside `apps/web`.
- `npm run build` passed inside `apps/web`.
- `git diff --cached --check` passed.

Hosted staging success request validation was not run because it requires private runtime/session values.

### Staging Runtime Validation

Issue #143 completed Next.js WebApp MVP staging runtime validation after the runtime/session, fetch failure handling, CORS compatibility, and staging reference alignment work.

Issue #152 completed staging default finance account reference preparation and resolved `invalid_account_reference` for the WebApp staging validation path.

Validated staging behavior:

- Runtime values remained local-only in `apps/web/.env.local`.
- Runtime values, credentials, session values, auth headers, database URLs, function URLs containing secrets, and access-granting values were not committed or recorded.
- Browser sign-in/session handling passed.
- Authenticated browser expense submit passed against `detabase-staging`.
- `log-finance-activity` accepted the WebApp request.
- A staging `finance_activities` expense was inserted through the WebApp request path.
- CORS/fetch compatibility passed after the prior compatibility fix.

This validation remains staging-only. It is not production-ready and does not introduce production access, schema or migration changes, Supabase config changes, deployment, Dashboard/reporting behavior, AI/Projection, transfer or adjustment support, aliases, legacy Sheets/GAS work, versioning, or production-ready claims.

Scope confirmation:

- No production access.
- No schema, migration, or Supabase config change.
- No Dashboard/reporting UI was introduced by that validation stage.
- No AI/Projection.
- No transfer or adjustment support.
- No aliases.
- No legacy Sheets/GAS work.
- No sensitive value disclosure.
- No versioning.
- No production-ready claim.

### Runtime Readiness And Safe Reference Guidance

PR #157 merged after Issue #156 completed WebApp runtime readiness and safe reference guidance implementation.

Runtime readiness behavior:

- Shows required runtime env names only.
- Shows configured/missing state for each required env name.
- Does not show runtime values.
- Keeps runtime values local-only in `apps/web/.env.local`.
- Keeps `apps/web/.env.local` uncommitted.

Safe reference guidance covers:

- `invalid_account_reference`: inspect the local-only default expense account UUID alignment against an active same-owner staging account reference.
- `invalid_category_reference`: inspect the local-only default expense category UUID alignment against an active same-owner staging expense category reference.
- `category_movement_mismatch`: inspect whether the local-only default expense category UUID points to an active same-owner staging category compatible with expense logging.

The existing expense request payload shape remains unchanged:

- `activity_date`.
- `movement_type = expense`.
- Positive amount.
- `currency = TWD`.
- Configured account/category UUID refs.
- Description.

The WebApp still does not send `source_indicator`.

Browser validation passed with safe evidence: runtime readiness was shown, env names only were displayed, signed-in browser submit succeeded, and the safe success message was shown.

This remains staging-only WebApp behavior. Production remains excluded, and this is not a production-ready claim. PR #157 introduced no schema or migration change, Supabase config change, Dashboard/reporting UI, AI/Projection, transfer or adjustment support, aliases, legacy Sheets/GAS work, sensitive value disclosure, versioning, or production-ready claim.

### Post-Submit Ready State And Repeat-Entry Flow

PR #162 merged after Issue #161 completed WebApp post-submit ready state and repeat-entry flow implementation.

After a successful expense save:

- The success message keeps the safe summary limited to date, TWD amount, and description.
- The success message indicates the form is ready for the next expense.
- Amount resets.
- Description resets.

When the operator starts entering the next amount or description, stale success or failure messages clear.

First-submit and second-submit browser validation passed with safe evidence:

- First submit succeeded.
- Amount and description reset after success.
- Next-entry input cleared the stale message.
- Second submit succeeded without changing runtime configuration.

The existing expense request payload shape remains unchanged:

- `activity_date`.
- `movement_type = expense`.
- Positive amount.
- `currency = TWD`.
- Configured account/category UUID refs.
- Description.

The WebApp remains expense-only and still does not send `source_indicator`.

`apps/web/.env.local` remains local-only and uncommitted.

This remains staging-only WebApp behavior. Production remains excluded, and this is not a production-ready claim. PR #162 introduced no schema or migration change, Supabase config change, Dashboard/reporting UI, AI/Projection, transfer/adjustment or income support, aliases, legacy Sheets/GAS work, sensitive value disclosure, versioning, or production-ready claim.

### Validated Staging-Use Operator Flow

Issue #166 documents the validated WebApp staging-use flow as a repeatable operator runbook.

This flow is staging-use only. Runtime values remain local-only in `apps/web/.env.local` or an approved local runtime environment. Do not commit, log, paste, screenshot, or document runtime values, credentials, auth headers, session values, database URLs, function URLs containing secrets, UUID values from local `.env.local`, or access-granting values.

Prepare local runtime values using env names only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_FINANCE_FUNCTION_URL`
- `NEXT_PUBLIC_DEFAULT_EXPENSE_ACCOUNT_ID`
- `NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID`

Do not record the values for those names in repo files, issues, PRs, logs, chat, or screenshots.

Validated operator flow:

1. Prepare local runtime values in `apps/web/.env.local` or the approved local runtime environment.
2. From `apps/web`, start the WebApp locally with the local Next.js CLI, for example:

   ```powershell
   .\node_modules\.bin\next dev --hostname 127.0.0.1 --port 3000
   ```

3. Open the local WebApp in a browser.
4. Confirm runtime readiness shows env names and configured/missing state only, not values.
5. Sign in with an existing staging auth user through the browser UI. Do not record credentials or session values.
6. Submit one expense with a positive whole TWD amount and description.
7. Confirm the safe success message shows only date, TWD amount, description, and ready-for-next-expense status.
8. Repeat entry if needed. After a successful submit, amount and description reset; stale success or failure messages clear when the next entry starts.
9. Stop the local WebApp server when finished.

The WebApp request shape remains:

- `activity_date`.
- `movement_type = expense`.
- Positive whole TWD amount.
- `currency = TWD`.
- Configured account/category UUID refs.
- Description.

The WebApp remains expense-only and still does not send `source_indicator`.

Decimal, zero, negative, blank, or invalid amount values are rejected by the WebApp input and submit validation path. Do not silently round decimal amount input.

Safe reference troubleshooting:

- For `invalid_account_reference`, inspect local-only account reference alignment and confirm the configured account reference points to an active same-owner staging account. Do not paste or record the UUID value.
- For `invalid_category_reference`, inspect local-only category reference alignment and confirm the configured category reference points to an active same-owner staging expense category. Do not paste or record the UUID value.
- For `category_movement_mismatch`, inspect local-only category purpose alignment and confirm the configured category reference is compatible with expense logging. Do not paste or record the UUID value.

Stop conditions:

- Stop if the staging target is unclear or could be production.
- Stop if production access, deployment, schema changes, migration changes, Supabase config changes, or Edge Function deployment would be required.
- Stop if private runtime values, credentials, auth headers, session values, database URLs, private function URLs, UUID values from local `.env.local`, or access-granting values would need to be recorded or shared.
- Stop if required local runtime values or staging auth credentials are missing.
- Stop if troubleshooting would require account/category selector UI, dynamic lookup, server routes, Dashboard/reporting, income/transfer/adjustment support, aliases, wrappers, package scripts, shortcut automation, auth architecture expansion, AI/Projection, or legacy Sheets/GAS work.

This runbook does not introduce production behavior and is not a production-ready claim.

## Finance Dashboard/Reporting MVP Boundary

Issue #170 documents the first Finance Dashboard/reporting MVP boundary after the Issue #169 recommendation.

This boundary is staging-only and read-only. It records the inspection surface for existing Finance MVP records and remains separate from production behavior and production-ready claims.

### Existing Table Boundary

The first Dashboard/reporting boundary may inspect existing Finance MVP tables only:

- `finance_activities`.
- `finance_accounts`.
- `finance_categories`.

No reporting views, functions, triggers, tables, materialized objects, schema changes, migrations, or Supabase config changes are included.

### First Surface

The first surface is limited to:

- Recent activities.
- Date range filter.
- Movement type filter.
- Account filter.
- Category filter.
- Totals by selected date range.
- Totals by `movement_type`.
- Totals by category.
- Totals by account.

### Display Fields

The display field boundary is:

- Activity date.
- Movement type.
- Amount.
- Currency.
- Account display name.
- Category display name.
- Description.
- Created timestamp if needed for review ordering.

### Future Data Access Boundary

Future implementation-readiness work must keep Dashboard/reporting data access:

- Staging-only.
- Read-only.
- Authenticated by the user session.
- Using the publishable key only.
- Limited to RLS-owned rows.
- Limited to direct Supabase browser client reads only if RLS select behavior is safely validated first.

If direct browser read access is not safely validated under existing RLS, stop and define a dedicated API/read boundary before any Dashboard implementation.

### Deferred Scope And Stop Conditions

Stop before work expands into:

- Dashboard implementation beyond the approved read-only review panel.
- Reporting views, functions, triggers, tables, or other reporting objects.
- Schema changes or migrations.
- Supabase config changes.
- Edge Function, API, or Next.js server route implementation.
- Production, deployment, or production-ready claims.
- Edit, delete, cleanup, pending-review management, or correction workflows.
- Account or category management.
- Formal charts or exports.
- Income, transfer, or adjustment input expansion.
- AI or Projection behavior.
- Aliases, wrappers, package scripts, or shortcut automation.
- Legacy Sheets/GAS work.
- Secrets, runtime values, local UUID values, credentials, auth headers, database URLs, private URLs, or access-granting values.

### Implemented Read-Only Review Panel

PR #176 merged after Issue #175 completed the first Dashboard/reporting MVP implementation inside the existing `apps/web` WebApp.

The implementation is limited to a staging-only, read-only finance review panel. It uses direct Supabase browser client reads with the authenticated user session, publishable-key-compatible access, and RLS-owned rows only.

The review panel reads existing Finance MVP tables only:

- `finance_activities`.
- `finance_accounts`.
- `finance_categories`.

The review panel supports:

- Recent owned activities.
- Date range filter.
- Movement type filter.
- Totals by selected range.
- Totals by `movement_type`.
- Totals by category display name.
- Totals by account display name.

Review validation passed with safe evidence. The review flow performed no writes.

The existing expense submit payload remains unchanged. The WebApp remains expense-only for input and still does not send `source_indicator`.

`apps/web/.env.local` remains local-only and uncommitted. Do not record runtime values, session values, UUID values from local runtime files, credentials, auth headers, database URLs, function URLs containing secrets, or access-granting values.

This implementation introduced no reporting views, functions, triggers, tables, materialized objects, schema changes, migrations, Supabase config changes, production access, deployment behavior, write-capable Dashboard behavior, edit/delete/cleanup/pending-review management, account/category management, charts, exports, AI/Projection, aliases, wrappers, package scripts, shortcut automation, legacy Sheets/GAS work, versioning, or production-ready claim.

### TWD Integer Amount Input And Display

The current WebApp MVP treats TWD amount entry as positive whole-number input.

- Valid positive integer TWD amount input may proceed to the existing expense save path.
- Decimal TWD input is rejected and must not be silently rounded.
- Zero, negative, blank, or invalid amount input remains rejected.
- The existing request payload shape remains unchanged.
- The WebApp remains expense-only for input and still does not send `source_indicator`.
- The read-only review panel displays TWD activity amounts and totals without decimal places.

This boundary changes WebApp validation and display only. It does not change schema, migrations, Supabase config, the existing database `amount` type, historical data, production access, deployment, reporting objects, write-capable Dashboard behavior, or production-ready status.

Next safe issue:

Define the next bounded post-TWD-integer-amount step without expanding into production, deployment, schema changes, reporting objects, write-capable Dashboard behavior, income/transfer/adjustment input expansion, or historical data cleanup.

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
