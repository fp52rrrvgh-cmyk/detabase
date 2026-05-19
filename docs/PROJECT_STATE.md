# Project State

## Current State

- Repository documentation skeleton has been initialized.
- Finance MVP record types, minimum details, first review summary, and legacy material usage are documented at the requirements level.
- Schema-blocking Finance MVP decisions are resolved at the documentation level.
- Finance MVP schema proposal is drafted at the conceptual level.
- Finance MVP schema proposal is reviewed and accepted for a draft database schema documentation step.
- Finance MVP draft database schema documentation is drafted for review.
- Finance MVP schema decisions are approved for draft SQL migration planning.
- Finance MVP draft SQL migration plan is documented at planning level.
- Finance MVP implementation-planning baseline is accepted for period review, active category uniqueness handling, RLS ownership, timestamp defaults, and first MVP indexes.
- Finance MVP migration implementation readiness is reviewed and approved at the documentation level.
- First Finance MVP migration file has been created at `supabase/migrations/20260518015307_create_finance_mvp_schema.sql`.
- The Finance MVP initial migration has passed local-only validation against `origin/main` at `8bc10ae`.
- Issue #25 is closed as completed after local forward-only migration workflow validation passed.
- Clean local replay/reset from `origin/main` passed.
- Migration ordering is stable for `20260518015307_create_finance_mvp_schema.sql`.
- Finance MVP schema, RLS, and policies remain present after replay.
- Issue #27 is closed as completed after local Finance MVP insert/query validation passed.
- Temporary local test account, category, income activity, and expense activity inserts passed.
- Local queries by account, category, date, and `movement_type` passed.
- Constraint validation passed for positive amounts, required category on income and expense, invalid `movement_type`, and invalid `source_indicator`.
- Same-owner composite foreign key validation passed.
- RLS policy definitions remain present and use `user_id = auth.uid()`.
- Issue #29 is closed as completed after local Finance MVP review-query validation passed.
- Local review queries by date range, account, category, and `movement_type` passed.
- Basic local totals for income, expense, category, and account in a date range passed.
- Issue #31 is closed as completed after defining the minimal local daily finance logging boundary at documentation level.
- Local Supabase DB uses port `55432`.
- Production database is untouched.
- No `service_role` key has been used.
- No repo files, SQL migrations, schema, Supabase config, production database, `service_role` key, App, API, Dashboard, Apple Shortcut, seed files, reporting tables, views, functions, or legacy Sheets/GAS were changed during validation.
- No application implementation is defined here.
- No deployment configuration is defined here.
- No App, API, Dashboard, Apple Shortcut, or legacy Sheets/GAS implementation exists.

## Known Scope

- Personal operations system, with finance as the first module.
- Source of truth documents live under `docs/`.

## Unknowns

- Application architecture.
- Data model.
- Deployment target.
- Dashboard requirements.
- Supabase project configuration approach.
