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

## Local Checks

```powershell
npm install
npm run build
```

The MVP signs in with an existing staging auth user, keeps session material in
the browser session path handled by `@supabase/supabase-js`, and sends one
expense request with `movement_type = expense`, `currency = TWD`, the current
local `activity_date`, the configured account/category UUIDs, and the entered
amount and description. It does not send `source_indicator`.
