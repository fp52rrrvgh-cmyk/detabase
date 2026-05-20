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

The page uses the Supabase browser client for a minimal staging email/password
sign-in flow. Credentials and session values are entered locally in the browser
only and must not be committed, logged, pasted, or documented.

The WebApp does not define sign-up, password reset, magic link, OAuth, a server
route, Dashboard behavior, production behavior, or schema/config changes.

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
