# Codex Audit: P0-3 Daily Spending Limit

Audit date: 2026-05-31

Documents audited:
- `specs/features/p0-3-daily-spending-limit/design.md`
- `/mnt/d/小馬收件匣/我給你的/codex-review-p0-3-daily-spending-limit.md`

Repo evidence read:
- `supabase/migrations/20260518015307_create_finance_mvp_schema.sql`
- `supabase/migrations/20260527000003_create_budgets.sql`
- `supabase/migrations/20260527081144_revoke_budget_grants_and_reapply.sql`
- `supabase/functions/set-budget/index.ts`
- `apps/web/app/dashboard/hooks/useDashboard.ts`
- `apps/web/app/settings/BudgetsTab.tsx`

## Recommendation

Recommend **B. custom-limit minimal**.

Reason: the feature document explicitly includes manual daily limits, so pure display-only is only sufficient if that product requirement is removed. A separate one-row-per-user table is the minimal persistence model for a custom daily limit without changing `finance_budgets`. However, the proposed `set-daily-limit` Edge Function is not justified by the actual codebase: the existing budget UI writes `finance_budgets` through PostgREST with the logged-in user's bearer token, and the existing `set-budget` Edge Function also forwards the caller token rather than using a service-role gateway.

## Three Options

### A. display-only

No new table. The dashboard derives daily limit as:

`sum(current-month budget limit_amount) / days_in_month`

This satisfies only the display portion of the feature. It matches the spec's fallback rule in `design.md:77-85` and can reuse data already loaded by `useDashboard`, which queries current-month `finance_budgets` at `apps/web/app/dashboard/hooks/useDashboard.ts:173-180` and builds `budgetList` at `apps/web/app/dashboard/hooks/useDashboard.ts:330-350`.

Audit verdict: **valid if custom daily limit is removed from scope**. It does not satisfy the documented requirement that daily limit can be manually set.

### B. custom-limit minimal

New table, no Edge Function. Use normal authenticated Supabase/PostgREST access with RLS and table-level grants.

This is the minimal option if manual limits remain required. Existing schema patterns already use user-owned finance tables with `user_id`, RLS, and authenticated grants. `finance_budgets` has per-user RLS policies at `supabase/migrations/20260527000003_create_budgets.sql:40-61`, and later grants authenticated table privileges because RLS alone is not enough for REST access at `supabase/migrations/20260527081144_revoke_budget_grants_and_reapply.sql:1-13`.

Audit verdict: **recommended**. It keeps persistence scoped to the new concept and avoids duplicating write paths.

### C. full-pattern

New table plus `set-daily-limit` Edge Function, as proposed.

The spec says to model it after `set-budget` at `design.md:180-193`, but actual `set-budget` is not a privileged service-role function. It extracts the caller bearer token at `supabase/functions/set-budget/index.ts:181-190`, builds REST headers using the publishable/anon key plus that caller token at `supabase/functions/set-budget/index.ts:211-215`, resolves identity through `/auth/v1/user` at `supabase/functions/set-budget/index.ts:226-235`, and upserts via PostgREST with the caller context at `supabase/functions/set-budget/index.ts:246-263`.

The app also already writes budgets directly without the Edge Function: `BudgetsTab` posts to `/rest/v1/finance_budgets` with the publishable key and session bearer token at `apps/web/app/settings/BudgetsTab.tsx:155-170`.

Audit verdict: **not recommended**. It adds another server surface without adding authorization strength beyond RLS for this simple one-row user preference.

## Audit Questions

### 1. Is `finance_daily_spending_limits` necessary?

If the product only shows monthly budget divided by days, **no table is necessary**. The dashboard already fetches current-month budgets and builds `budgetList`, so the derived amount can live with that dashboard summary calculation.

If custom daily limit is required, **a new table is the minimal clean solution**. Adding daily-limit semantics to `finance_budgets` would violate the design constraint not to modify `finance_budgets` (`design.md:20`) and would mix category/month budgets with a user-level daily preference.

The one-row-per-user design is reasonable for the stated product model: `design.md:30` says each user has one daily limit setting with no monthly time dimension, and `design.md:51-53` proposes uniqueness on `user_id`. Existing finance tables use `user_id` ownership and RLS patterns; for example accounts and categories define `(user_id, id)` uniqueness at `supabase/migrations/20260518015307_create_finance_mvp_schema.sql:6-32`, and budgets use a uniqueness rule matching their domain at `supabase/migrations/20260527000003_create_budgets.sql:9-28`.

One caveat: storing `is_auto=true` together with a persisted `daily_limit_amount` conflicts with the spec's own statement that the auto value is instantaneous and should not be persisted (`design.md:85`). That is a design consistency issue, not a reason to add more infrastructure.

### 2. Is `set-daily-limit` necessary?

No, not for this feature as scoped.

The actual `set-budget` pattern is a caller-token PostgREST wrapper, not a service-role write gateway. Because it uses caller auth, it still depends on normal table grants and RLS. The direct frontend budget write in `BudgetsTab` proves the codebase already accepts Supabase client/PostgREST writes for this domain.

If an Edge Function is still chosen and it follows `set-budget`, it does **not** require a service-role grant. It requires authenticated table privileges plus RLS policies, the same issue documented by the budget grant migration at `supabase/migrations/20260527081144_revoke_budget_grants_and_reapply.sql:1-13`.

If an Edge Function instead uses `SUPABASE_SERVICE_ROLE_KEY`, then it departs from `set-budget` and should have explicit service-role privileges matching existing service-role migrations such as `supabase/migrations/20260527084116_grant_service_role_finance_activities.sql`. That is not the pattern the spec says to copy.

### 3. Where should auto-calc fallback live?

Pick **frontend `useDashboard` hook**, for this scope.

Reason: all inputs are already present there. `useDashboard` loads current-month budgets at `apps/web/app/dashboard/hooks/useDashboard.ts:173-180`, calculates `budgetList` at `apps/web/app/dashboard/hooks/useDashboard.ts:330-350`, and already produces dashboard-only derived values such as daily trend and briefing at `apps/web/app/dashboard/hooks/useDashboard.ts:318-358`.

A shared util is unnecessary until another screen needs the same calculation. A database view/RPC is heavier and would duplicate dashboard aggregation boundaries. An Edge Function is the least justified place because this is display data, not a privileged operation.

### 4. Should `dailyExpense` alias `todayExpense`?

No.

`DashboardSummary` already exposes `todayExpense` at `apps/web/app/dashboard/hooks/useDashboard.ts:25-30`, calculates it at `apps/web/app/dashboard/hooks/useDashboard.ts:286-289`, and returns it in the success state at `apps/web/app/dashboard/hooks/useDashboard.ts:405-411`. The dashboard page already consumes `state.data.todayExpense` for today's expense display at `apps/web/app/dashboard/page.tsx:438`.

Adding `dailyExpense` as an alias would create two names for the same semantic field without adding information. The component can receive `todayExpense` as its `spent` prop without changing the data contract.

### 5. Scope Control

Confirmed out of scope:

- Full budget system redesign: the spec explicitly says not to modify `finance_budgets` (`design.md:20`).
- AI recommendations: neither audited document requires AI-generated limits; the review package lists AI recommendations as excluded.
- Settings page modification: the review package states Settings changes are not included for this P0 item.
- Holiday weighting: the review package treats holiday weighting as a future/P2 concern.
- Debt/transfer modules: the review package explicitly excludes transfer/debt modules, and the feature only reads expense totals and budgets.

## Final Verdict

Choose **B. custom-limit minimal** if manual daily limits are part of P0-3. Choose **A. display-only** only if the product owner accepts dropping manual daily limit persistence. Do not choose **C. full-pattern** unless there is a separate policy decision that all writes must go through Edge Functions, because the actual repository does not currently enforce that pattern for budgets.
