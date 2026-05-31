# Decisions

## Accepted

- Keep source of truth documentation in `docs/`.
- Keep this initial pass limited to documentation skeletons.
- For the Finance MVP, legacy Sheets + GAS may be used for import reference and comparison checks only, and is not the formal baseline.
- For the Finance MVP, accepted money movement types are income, expense, transfer, and adjustment.
- For the Finance MVP, accepted account roles or types are cash, bank, credit_card, stored_value, digital_account, and other.
- For the Finance MVP, categories are single-level only for the first implementation; multi-level categories are not defined yet.
- For the Finance MVP, single-currency TWD is enough for the first implementation.
- For the Finance MVP, transfer is represented as one activity for now; paired entries can be revisited during schema design.
- For the Finance MVP, merchant or payee, payment method, and transfer pairing note are promoted before schema design.
- For the Finance MVP, attachments, audit history, tags beyond category, and recurring marker are not promoted yet.
- For the Finance MVP, the conceptual entities finance activity, finance account, and finance category are accepted for the next documentation step.
- For the Finance MVP, the conceptual entity names are accepted for now.
- For the Finance MVP, the schema proposal may proceed to a draft database schema documentation step.
- For the Finance MVP, activity date or period, amount, movement type, and account reference are required for the next schema documentation step.
- For the Finance MVP, category reference is required for expense and income, and optional for transfer and adjustment.
- For the Finance MVP, currency is fixed to TWD for the first implementation.
- For the Finance MVP, inactive account or category references should not be used for new manual entries, but historical records may still reference them.
- For the Finance MVP, transfer pairing note is optional.
- For the Finance MVP, import identifiers should include source indicator, optional source system name, and optional source record reference.
- For the Finance MVP, duplicate detection remains an import-review concern and is not a blocking requirement for the first draft schema.
- For the Finance MVP, primary keys and references should use uuid identifiers.
- For the Finance MVP, amount should be stored as positive-only and direction should be interpreted through movement_type.
- For the Finance MVP, user_id should be included in the first schema to prepare for Supabase Auth / RLS ownership.
- For the Finance MVP, inactive account or category usage for new manual entries should be enforced through App/API validation first, while database-level foreign key integrity preserves historical references.
- For the Finance MVP, source_indicator allowed values are manual, import_reference, and comparison_reference.
- For the Finance MVP, the first MVP indexes are finance_activities.activity_date, finance_activities.account_id, finance_activities.category_id, and finance_activities.movement_type.
- For the Finance MVP, future migration files should live under `supabase/migrations/` only if Supabase CLI is intentionally introduced in the implementation issue.
- For the Finance MVP, migration file naming should follow Supabase timestamped migration naming: `YYYYMMDDHHMMSS_create_finance_mvp_schema.sql`.
- For the Finance MVP, UUID generation should use a Postgres/Supabase-supported UUID default, with the exact extension and function confirmed during migration implementation.
- For the Finance MVP, RLS ownership should use `user_id = auth.uid()` for user-owned finance rows.
- For the Finance MVP, the first migration is forward-only in normal operation; local or staging rollback may use reset or a corrective migration.
- For the Finance MVP, destructive production rollback is not allowed without explicit human approval.
- For the Finance MVP, the next issue may create the first migration file, but must not apply it to production.

## Pending

- Architecture decisions.
- Data model decisions.
- Deployment decisions.
- Migration decisions.
