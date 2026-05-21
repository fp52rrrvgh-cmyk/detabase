# Finance WebApp MVP

This is the minimal Next.js App Router expense-entry WebApp for the staging
Finance ingestion path.

## Runtime Environment Names

Set these names in the local or deployment environment without committing
values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_FINANCE_FUNCTION_URL`
- `NEXT_PUBLIC_DEFAULT_EXPENSE_ACCOUNT_ID`
- `NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID`

The page shows runtime readiness by environment variable name only. It reports
whether each required name is configured, but never displays the configured
value. Local values should stay in `apps/web/.env.local` or the operator's
approved runtime environment and must not be committed, logged, pasted, or
documented.

The page uses the Supabase browser client for a minimal staging email/password
sign-in flow. Credentials and session values are entered locally in the browser
only and must not be committed, logged, pasted, or documented.

The WebApp does not define sign-up, password reset, magic link, OAuth, a server
route, Dashboard behavior, production behavior, or schema/config changes.

## Read-Only Finance Review Panel

The WebApp includes a staging-only read-only finance review panel for the
signed-in user. It uses the existing Supabase browser client session and
publishable-key-compatible direct reads from existing Finance MVP tables only:

- `finance_activities`
- `finance_accounts`
- `finance_categories`
- `finance_activity_corrections`

The review panel is read-only and limited to RLS-owned rows. It does not use
`service_role`, server routes, Edge Functions, reporting views, reporting
tables, schema changes, migrations, Supabase config changes, deployment, or
production access.

The panel can show:

- recent owned activities;
- date range filtering;
- movement type filtering with an all option;
- totals for the selected date range;
- totals by movement type;
- totals by category display name;
- totals by account display name.

Default review and totals use active-only semantics. Activities with an
effective `void` correction event are excluded from the default recent activity
list and all default totals. Original `finance_activities` rows remain
preserved, and `finance_activity_corrections` remains the audit trail.

The WebApp includes intentional read-only void audit visibility inside the
review panel. The audit trail is not the default view; the operator must
explicitly open it. The audit trail can show voided activity context, void
reason, correction timestamp, activity date, movement type, TWD amount,
currency, account display name, category display name, description, and original
created timestamp when needed for review ordering. It does not add audit totals.
It does not provide correction management UI, edit/delete UI, mutation buttons,
void creation flows, or write-capable Dashboard behavior.

The review panel includes a compact read-only review state strip. The strip is
informational only and uses existing loaded review state. It shows safe labels
and counts such as active review mode, selected date range, movement filter,
void audit hidden or intentionally shown state, loaded active activity count,
void audit count when available, and read-only/no-writes status. It does not
change query semantics, default active-only totals, or intentional void audit
visibility, and it must not display UUID values, runtime values, tokens,
session values, database URLs, function URLs, or secrets.

Safe display fields are activity date, movement type, amount, currency, account
display name, category display name, description, void reason, correction
timestamp, and created timestamp when needed for review ordering. The panel must
not display credentials, tokens, auth headers, runtime values, session values,
function URLs containing secrets, database URLs, user identifiers, or UUID
values from local runtime files.

TWD amount display is whole-number only. The review panel formats TWD activity
amounts and totals without decimal places.

If read-only review data cannot load, inspect staging auth, RLS, and table
grant setup locally without pasting private values into issues, PRs, docs, or
logs. Stop if troubleshooting would require writes, schema/config changes,
server routes, reporting objects, production access, or secret disclosure.

## Safe Reference Guidance

The expense form keeps account and category references UUID-first through the
runtime environment names above. It does not perform selector lookup, dynamic
reference discovery, or server-side reference resolution.

If the staging ingestion endpoint returns a safe reference error, inspect local
runtime setup without exposing values:

- `invalid_account_reference`: check that
  `NEXT_PUBLIC_DEFAULT_EXPENSE_ACCOUNT_ID` in `apps/web/.env.local` points to an
  active staging account owned by the signed-in staging caller.
- `invalid_category_reference`: check that
  `NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID` in `apps/web/.env.local` points to
  an active staging expense category owned by the signed-in staging caller.
- `category_movement_mismatch`: check that
  `NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID` points to an active same-owner
  staging category whose grouping purpose is compatible with expense logging.

Duplicate, inactive, wrong-owner, or income-category references should be fixed
through approved staging operator handling outside the WebApp. Do not paste
runtime values, session values, auth headers, tokens, database URLs, or private
function URLs into issues, PRs, docs, or logs.

## Repeat Entry Behavior

After a successful expense save, the page shows a safe summary with only the
activity date, TWD amount, and description, then indicates that the form is
ready for the next expense. The amount and description fields are cleared after
success.

When the operator starts entering the next amount or description, stale success
or failure messages are cleared. The next expense uses the same fixed
expense/TWD/local-date request shape and the same configured account/category
runtime references.

## Validated Staging-Use Flow

This WebApp is operated locally against the staging ingestion path. Runtime
values stay local-only in `apps/web/.env.local` or the approved local runtime
environment and must not be committed, logged, pasted, or documented.

Prepare local runtime values by env name only:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_FINANCE_FUNCTION_URL`
- `NEXT_PUBLIC_DEFAULT_EXPENSE_ACCOUNT_ID`
- `NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID`

Do not record the values for these names.

Operator flow:

1. Confirm local runtime values are prepared.
2. Start the WebApp locally from `apps/web`:

   ```powershell
   .\node_modules\.bin\next dev --hostname 127.0.0.1 --port 3000
   ```

3. Open the local WebApp.
4. Confirm runtime readiness shows env names and configured/missing state only.
5. Sign in with an existing staging auth user without recording credentials or
   session values.
6. Submit one expense with a positive amount and description.
7. Confirm the safe success message shows date, TWD amount, description, and
   ready-for-next-expense status.
8. Confirm the read-only review panel loads recent active owned activities,
   display names, filters, active-only totals, and safe review state strip
   labels without performing writes.
9. Open the void audit trail only when intentional audit inspection is needed,
   and confirm it remains read-only.
10. Repeat entry if needed.
11. Stop the local server when finished.

The request shape remains `activity_date`, `movement_type = expense`, positive
whole TWD amount, `currency = TWD`, configured account/category UUID refs, and
description. Decimal, zero, negative, blank, or invalid amounts are rejected.
The WebApp still does not send `source_indicator`.

Stop if the target could be production, runtime values are missing, credentials
or UUID values would need to be recorded, or the workflow expands into
deployment, server routes, selector/dynamic lookup, write-capable Dashboard
behavior, reporting objects,
income/transfer/adjustment support, aliases, wrappers, package scripts,
shortcut automation, auth architecture changes, schema/migration/Supabase config
changes, AI/Projection, or legacy Sheets/GAS work.

This staging-use flow is not production-ready.

## Local Checks

```powershell
npm install
npm run build
```

The MVP signs in with an existing staging auth user, keeps session material in
the browser session path handled by `@supabase/supabase-js`, and sends one
expense request with `movement_type = expense`, `currency = TWD`, the current
local `activity_date`, the configured account/category UUIDs, and the entered
positive whole TWD amount and description. It does not send `source_indicator`.
