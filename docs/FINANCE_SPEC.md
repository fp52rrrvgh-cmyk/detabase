# Finance Spec

## MVP Goal

Define the first finance module boundary for tracking personal financial activity at a documentation level.

The MVP should make it possible to capture basic finance records, review them, and identify what decisions are still needed before any implementation work starts.

## In Scope

- Transaction-like records for personal money movement.
- Account-like records as labels or references for where money is held or used.
- Category-like records as labels or references for grouping activity.
- Basic review views or summaries at the requirements level only.
- Import reference and comparison notes for legacy Sheets + GAS material, without treating legacy structure or logic as the formal baseline.

## Out of Scope for MVP

- Final database schema implementation.
- Migrations.
- Supabase configuration.
- API or Edge Function code.
- Dashboard code.
- App UI.
- Apple Shortcut implementation.
- Automated bank sync.
- Formal reporting behavior.
- Legacy Sheets + GAS formulas, field names, Apps Script logic, or report behavior as the new baseline.

## First Input Flow Assumptions

- The first input flow is manual or user-triggered.
- Input requirements should describe intent and record boundaries before implementation details.
- Apple Shortcut work may be considered later, but no Shortcut flow is part of this MVP definition.
- Legacy Sheets + GAS may be reviewed as reference or comparison material only.

## First Review and Reporting Assumptions

- The first review flow should help inspect captured finance activity.
- Reporting should remain lightweight until required fields and grouping rules are decided.
- Any totals, summaries, or charts remain requirements placeholders until the data model is chosen.

## First MVP Record Types

- Money movement record: captures one personal finance activity that changes or describes money movement.
- Account reference record: names where money is held, spent from, received into, or otherwise associated.
- Category reference record: groups money movement for review.

These are requirement-level record types only. They are not database tables, schema names, API contracts, or UI models.

## Minimum Details Required

### Money Movement Record

- Date or time period of the activity.
- Amount.
- Direction or effect: income, expense, transfer, or adjustment.
- Account reference.
- Category reference when applicable.
- Short description or note.
- Source indicator, such as manual entry, import reference, or comparison reference.
- Merchant or payee when applicable.
- Payment method when applicable.
- Transfer pairing note when applicable.

### Account Reference Record

- Account display name.
- Account role or type: cash, bank, credit_card, stored_value, or other.
- Active or inactive status for review purposes.

### Category Reference Record

- Category display name.
- Single-level category role or grouping purpose.
- Active or inactive status for review purposes.

## Candidate Details Not Finalized

- Recurring activity marker.
- Attachments or receipt references.
- Tags beyond category.
- Validation rules.
- Import identifiers.
- Audit history.

## Resolved Schema-Blocking Decisions

- Accepted money movement types: income, expense, transfer, adjustment.
- Accepted account roles or types: cash, bank, credit_card, stored_value, other.
- Category grouping: use single-level category only for the first implementation.
- Category grouping not included yet: multi-level categories.
- Currency handling: single-currency TWD is enough for the first implementation.
- Transfer representation: represent transfer as one activity for now.
- Transfer pairing can be revisited during schema design.
- Candidate details promoted before schema design: merchant or payee, payment method, transfer pairing note.
- Candidate details not promoted yet: attachments, audit history, tags beyond category, recurring marker.

## First Review Summary Requirement

The first review summary should let the user inspect captured money movement by time period, account reference, and category reference.

The summary may include basic totals and groupings, but exact calculations, charts, dashboards, and reporting behavior remain undecided until schema design is ready.

## Finance MVP Schema Proposal

This section is a proposal only. It describes conceptual entities and candidate attributes for review before any final database schema, SQL, migration, Supabase configuration, API contract, or UI model exists.

### Proposed Conceptual Entities

- Finance activity: proposed primary entity for one money movement.
- Finance account: proposed reference entity for where money is held, spent from, received into, or otherwise associated.
- Finance category: proposed reference entity for single-level grouping.

### Entity Purpose

- Finance activity supports capture and review of income, expense, transfer, and adjustment activity.
- Finance account supports grouping activity by cash, bank, credit_card, stored_value, or other account role.
- Finance category supports first-pass single-level review grouping.

### Requirement Mapping

- Money movement record maps to proposed finance activity.
- Account reference record maps to proposed finance account.
- Category reference record maps to proposed finance category.
- Single-currency TWD requirement maps to a proposed finance activity currency assumption.
- One-activity transfer representation maps to proposed finance activity transfer handling.
- Merchant or payee, payment method, and transfer pairing note map to proposed finance activity attributes.

### Proposed Relationship Direction

- Finance activity references one finance account.
- Finance activity may reference one finance category when applicable.
- Transfer activity remains one finance activity and may include a transfer pairing note.
- Finance account and finance category do not depend on finance activity conceptually.

### Candidate Attributes

These are proposed attributes only, not final column names, SQL types, constraints, indexes, or API fields.

#### Finance Activity

- Activity date or period.
- Amount.
- Currency assumption: TWD.
- Movement type: income, expense, transfer, or adjustment.
- Account reference.
- Category reference when applicable.
- Short description or note.
- Source indicator.
- Merchant or payee when applicable.
- Payment method when applicable.
- Transfer pairing note when applicable.

#### Finance Account

- Display name.
- Role or type: cash, bank, credit_card, stored_value, or other.
- Active or inactive review status.

#### Finance Category

- Display name.
- Single-level grouping purpose.
- Active or inactive review status.

### Validation Questions Still Unresolved

- Which fields are always required for each movement type?
- Which movement types require category reference?
- How should amount signs or direction be validated?
- What rules should apply to inactive account or category references?
- What validation is needed for transfer pairing notes?

### Import Identifier Questions Still Unresolved

- Is a source system identifier needed for imported or compared legacy material?
- Is a source row or source record reference needed?
- Should import identifiers be stored as user-visible notes or internal references?
- How should duplicate detection be handled during import review?

## Schema Proposal Review Result

The Finance MVP schema proposal is accepted for the next documentation step.

### Accepted Conceptual Entities

- Finance activity is accepted as the primary money movement entity.
- Finance account is accepted as the account reference entity.
- Finance category is accepted as the single-level grouping reference entity.

The entity names are accepted for now.

### Accepted Validation Requirements for the Next Step

- Activity date or period is required.
- Amount is required.
- Movement type is required.
- Account reference is required.
- Category reference is required for expense and income.
- Category reference is optional for transfer and adjustment.
- Currency is fixed to TWD for the first implementation.
- Inactive account or category references should not be used for new manual entries.
- Historical records may still reference inactive account or category references.
- Transfer pairing note is optional.

### Accepted Import Identifier Requirements for the Next Step

- Include source indicator.
- Include optional source system name.
- Include optional source record reference.
- Duplicate detection remains an import-review concern, not a blocking requirement for the first draft schema.

### Remaining Review Questions

- What final database schema should represent the accepted conceptual entities?
- Which implementation checks are required before code or configuration work starts?

## Draft Database Schema Documentation

This section is draft documentation for review only. It is not a SQL migration, final database schema, Supabase configuration, API contract, Dashboard model, App UI model, or production-ready implementation.

### Proposed Tables

- `finance_accounts`: stores account reference records.
- `finance_categories`: stores single-level category reference records.
- `finance_activities`: stores money movement records.

These table names are proposed for review and may change before implementation.

### Proposed Columns

#### `finance_accounts`

| Column | Documentation-level type | Required | Purpose |
| --- | --- | --- | --- |
| `id` | uuid | yes | Stable account reference identifier. |
| `user_id` | uuid reference | yes | Owning user reference for future Supabase Auth / RLS ownership. |
| `display_name` | text | yes | User-facing account name. |
| `account_type` | enum-like text | yes | One of cash, bank, credit_card, stored_value, other. |
| `is_active` | boolean | yes | Indicates whether the account is available for new manual entries. |
| `created_at` | timestamp | yes | Record creation time. |
| `updated_at` | timestamp | yes | Last update time. |

#### `finance_categories`

| Column | Documentation-level type | Required | Purpose |
| --- | --- | --- | --- |
| `id` | uuid | yes | Stable category reference identifier. |
| `user_id` | uuid reference | yes | Owning user reference for future Supabase Auth / RLS ownership. |
| `display_name` | text | yes | User-facing category name. |
| `grouping_purpose` | text | no | Optional note for the single-level grouping purpose. |
| `is_active` | boolean | yes | Indicates whether the category is available for new manual entries. |
| `created_at` | timestamp | yes | Record creation time. |
| `updated_at` | timestamp | yes | Last update time. |

#### `finance_activities`

| Column | Documentation-level type | Required | Purpose |
| --- | --- | --- | --- |
| `id` | uuid | yes | Stable activity identifier. |
| `user_id` | uuid reference | yes | Owning user reference for future Supabase Auth / RLS ownership. |
| `activity_date` | date | yes | Date of the activity. |
| `amount` | positive decimal number | yes | Activity amount; direction is interpreted through movement type. |
| `currency` | enum-like text | yes | Fixed to TWD for the first implementation. |
| `movement_type` | enum-like text | yes | One of income, expense, transfer, adjustment. |
| `account_id` | uuid reference | yes | References the related account. |
| `category_id` | uuid reference | conditional | Required for expense and income; optional for transfer and adjustment. |
| `description` | text | no | Short description or note. |
| `source_indicator` | enum-like text | yes | One of manual, import_reference, comparison_reference. |
| `source_system_name` | text | no | Optional source system name for import or comparison material. |
| `source_record_reference` | text | no | Optional source record reference for import or comparison material. |
| `merchant_or_payee` | text | no | Merchant or payee when applicable. |
| `payment_method` | text | no | Payment method when applicable. |
| `transfer_pairing_note` | text | no | Optional note for transfer pairing review. |
| `created_at` | timestamp | yes | Record creation time. |
| `updated_at` | timestamp | yes | Last update time. |

### Proposed Relationships

- `finance_activities.account_id` references `finance_accounts.id`.
- `finance_activities.category_id` references `finance_categories.id` when a category applies.
- `finance_activities.user_id`, `finance_accounts.user_id`, and `finance_categories.user_id` prepare for ownership-aware access.
- `finance_accounts` and `finance_categories` are reference tables and do not depend on `finance_activities`.
- Transfer remains represented as one `finance_activities` record for the first implementation.

These relationships are draft documentation only and are not final foreign key definitions.

### Proposed Constraints

- `finance_accounts.account_type` should be limited to cash, bank, credit_card, stored_value, other.
- `finance_activities.movement_type` should be limited to income, expense, transfer, adjustment.
- `finance_activities.source_indicator` should be limited to manual, import_reference, comparison_reference.
- `finance_activities.currency` should be fixed to TWD for the first implementation.
- `finance_activities.amount` should be present for every activity.
- `finance_activities.amount` should be positive-only; movement direction is interpreted through `movement_type`.
- `finance_activities.account_id` should be present for every activity.
- `finance_activities.category_id` should be present for expense and income.
- `finance_categories.display_name` should be unique among active categories unless a future decision allows duplicates.
- New manual entries should not use inactive account or category references; enforce this first through App/API validation.
- Historical records may keep inactive account or category references.
- Database-level foreign key integrity should still preserve historical references.

These constraints are proposed at documentation level and are not implementation syntax.

### Proposed Indexes

- Index `finance_activities.activity_date` for time-period review.
- Index `finance_activities.account_id` for account review.
- Index `finance_activities.category_id` for category review.
- Index `finance_activities.movement_type` for movement-type filtering.
- Consider a composite review index on activity date plus account reference after query patterns are confirmed.

These indexes are proposed for review only and do not define final database indexes.

### RLS and Ownership Assumptions

- Finance records are owned by the personal system user.
- Include `user_id` in the first schema to prepare for Supabase Auth / RLS ownership.
- Access should be scoped to the owning user if multi-user storage is ever introduced.
- No shared workspace, team access, or public access is assumed for the Finance MVP.
- RLS policy details are not defined in this documentation step.

### Remaining Questions Before Migration Work

- Should period-based review be derived from `activity_date`, or should a separate period field be introduced later?
- Which proposed indexes are actually needed for the first queries?
- What RLS policy shape is required if Supabase is used later?

### Approved Decisions Before Migration Planning

- Use `uuid` identifiers for primary keys and references.
- Store `amount` as positive-only and interpret direction through `movement_type`.
- Include `user_id` in the first schema to prepare for Supabase Auth / RLS ownership.
- Enforce inactive account or category usage for new manual entries through App/API validation first.
- Keep database-level foreign key integrity for historical references.
- Finalize `source_indicator` allowed values as manual, import_reference, comparison_reference.
- Confirm the first MVP indexes: `finance_activities.activity_date`, `finance_activities.account_id`, `finance_activities.category_id`, `finance_activities.movement_type`.

## Draft SQL Migration Plan

This section is planning-only documentation. It is not executable SQL, not a migration file, not Supabase configuration, and not implementation approval.

### Planning-Level Table Definitions

#### `finance_accounts`

- Primary key: `id` as uuid.
- Ownership: `user_id` as uuid reference for future Supabase Auth / RLS ownership.
- Required fields: `display_name`, `account_type`, `is_active`, `created_at`, `updated_at`.
- Account type values: cash, bank, credit_card, stored_value, other.
- Purpose: account reference table for money movement records.

#### `finance_categories`

- Primary key: `id` as uuid.
- Ownership: `user_id` as uuid reference for future Supabase Auth / RLS ownership.
- Required fields: `display_name`, `is_active`, `created_at`, `updated_at`.
- Optional fields: `grouping_purpose`.
- Purpose: single-level category reference table for review grouping.

#### `finance_activities`

- Primary key: `id` as uuid.
- Ownership: `user_id` as uuid reference for future Supabase Auth / RLS ownership.
- Required fields: `activity_date`, `amount`, `currency`, `movement_type`, `account_id`, `source_indicator`, `created_at`, `updated_at`.
- Conditional field: `category_id` is required for income and expense, and optional for transfer and adjustment.
- Optional fields: `description`, `source_system_name`, `source_record_reference`, `merchant_or_payee`, `payment_method`, `transfer_pairing_note`.
- Purpose: money movement table for income, expense, transfer, and adjustment records.

### Migration Planning Constraints

- Use uuid primary keys for all Finance MVP tables.
- Include `user_id` on all Finance MVP tables.
- Store `finance_activities.amount` as positive-only.
- Interpret money direction through `finance_activities.movement_type`.
- Fix `finance_activities.currency` to TWD for the first implementation.
- Limit `finance_activities.movement_type` to income, expense, transfer, adjustment.
- Limit `finance_accounts.account_type` to cash, bank, credit_card, stored_value, other.
- Limit `finance_activities.source_indicator` to manual, import_reference, comparison_reference.
- Require `finance_activities.category_id` for income and expense.
- Keep `finance_activities.category_id` optional for transfer and adjustment.
- Preserve database-level FK integrity for account and category references.
- Enforce inactive account and category usage for new manual entries through App/API validation first.
- Preserve historical references even when an account or category becomes inactive.

### Migration Planning Indexes

- Plan an index for `finance_activities.activity_date`.
- Plan an index for `finance_activities.account_id`.
- Plan an index for `finance_activities.category_id`.
- Plan an index for `finance_activities.movement_type`.

### RLS Planning Assumptions

- Records should be scoped by `user_id`.
- The first ownership model should prepare for Supabase Auth.
- Use `user_id = auth.uid()` as the core RLS ownership baseline.
- No shared workspace is assumed.
- No public access is assumed.
- Exact RLS policy syntax is deferred until implementation planning.

### Accepted Implementation-Planning Baseline

- Derive period-based review from `activity_date`.
- Handle active category display-name uniqueness through App/API validation first.
- Use `user_id = auth.uid()` as the core RLS ownership baseline.
- Use database defaults for timestamps where appropriate.
- Keep the first MVP indexes limited to `finance_activities.activity_date`, `finance_activities.account_id`, `finance_activities.category_id`, and `finance_activities.movement_type`.

### Open Questions Before Actual Migration Implementation

- Which Postgres/Supabase-supported UUID default function should be used during migration implementation?
- What exact RLS policy syntax should implement the `user_id = auth.uid()` ownership baseline?

### Migration Implementation Readiness Review

- Future migration files should live under `supabase/migrations/` only if Supabase CLI is intentionally introduced in the implementation issue.
- Migration file naming should follow Supabase timestamped migration naming: `YYYYMMDDHHMMSS_create_finance_mvp_schema.sql`.
- UUID generation should use a Postgres/Supabase-supported UUID default, with the exact extension and function confirmed during migration implementation.
- RLS ownership pattern should use `user_id = auth.uid()` for user-owned finance rows.
- The first migration is forward-only in normal operation.
- Local or staging rollback may use reset or a corrective migration.
- Destructive production rollback is not allowed without explicit human approval.
- This review passes for migration implementation readiness.
- The next issue may create the first migration file, but must not apply it to production.

### Required Checks Before Supabase or Migration Work

- Confirm migration file naming and location before creating any migration.
- Confirm whether Supabase CLI and project configuration are intentionally being introduced.
- Confirm required extensions or database capabilities for uuid generation.
- Confirm RLS policy approach before writing policy SQL.
- Confirm rollback expectations for the first migration.
- Re-check `docs/DO_NOT_DO.md` and this Finance spec before implementation starts.

## Legacy Material Usage Decision

Legacy Sheets + GAS may be used for import reference and comparison checks only.

Legacy formulas, field names, Apps Script logic, report behavior, and sheet structure are not the formal baseline.

## Minimal Local Daily Finance Logging Boundary

This boundary defines the smallest local-only daily logging shape for the Finance MVP. It is documentation-only and does not define App, API, Dashboard, Shortcut, seed, reporting, or production behavior.

### Minimum Daily Logging Record Shape

A usable daily logging record is one `finance_activities` record that can be tied to the local owner, one account, and, when required, one category.

The record should be enough to answer when the activity happened, what amount was recorded, what kind of money movement it was, where it belongs, and whether it came from manual local logging.

### Required Fields

- Local owner reference through `user_id`.
- `activity_date`.
- Positive `amount`.
- Fixed `currency` of TWD.
- `movement_type`: income, expense, transfer, or adjustment.
- `account_id`.
- `category_id` for income and expense.
- `source_indicator`, expected to be `manual` for local daily logging.

### Optional Fields

- `category_id` for transfer and adjustment.
- `description`.
- `merchant_or_payee`.
- `payment_method`.
- `transfer_pairing_note`.
- `source_system_name`.
- `source_record_reference`.

### Local-Only Input Assumptions

- Daily logging remains local-only until production access is explicitly approved.
- Input is manual or user-triggered.
- Account and category references already exist locally before logging activity.
- New manual daily logging should use active account and category references.
- Period-based review is derived from `activity_date`.
- No seed data, App, API, Dashboard, Apple Shortcut, AI, Projection, or legacy Sheets/GAS workflow is introduced by this boundary.

### Validation Expectations

- `amount` must be positive.
- `movement_type` must use the accepted Finance MVP values.
- `source_indicator` must use an accepted value and should be `manual` for local daily logging.
- Income and expense records require `category_id`.
- Activity account and category references must belong to the same `user_id` as the activity.
- Local review queries should continue to work by date range, account, category, and `movement_type`.
- RLS policy definitions should continue to use `user_id = auth.uid()`.

### Usable Daily Logging Record Definition

A usable local daily logging record is valid when it can be inserted locally using the existing Finance MVP schema, passes existing constraints and same-owner foreign keys, and can be retrieved by the validated local review-query patterns.

This definition does not make the project production-ready and does not define a final product workflow.

### Explicitly Out of Scope

- SQL migration changes.
- New migrations.
- Supabase configuration changes.
- Seed files or seed data.
- Logging implementation.
- App, API, Dashboard, Apple Shortcut, AI, or Projection behavior.
- Views, functions, triggers, or reporting tables.
- Formal reporting or dashboard behavior.
- Production access.
- `service_role` key usage.
- Remote Supabase linking.
- Legacy Sheets/GAS porting.
- Version labels or production-ready claims.

### Open Questions Before Implementation

- Which local accounts and categories should exist before a daily logging validation can run?
- Which optional fields should be promoted for the first manual logging workflow?
- Should transfer and adjustment daily logging require additional local validation beyond the current schema constraints?
- What is the smallest local-only interface or command shape that can exercise daily logging without starting App, API, Dashboard, or Shortcut work?

### Recommended Next Issue

Validate local daily finance logging boundary with temporary local records.

## Minimal Local Manual Finance Logging Interface Boundary

This boundary defines the smallest local-only manual input shape that could produce a valid daily finance logging record. It is documentation-only and does not define a command, script, API, App, Dashboard, Shortcut, seed data, reporting object, AI behavior, Projection behavior, or production workflow.

### Minimum Local Manual Input Shape

A local manual logging action should capture one intended `finance_activities` record from user-entered values, using existing local account and category references.

Minimum shape:

- Date.
- Amount.
- Movement type.
- Account reference.
- Category reference for income and expense.
- Optional note or context fields.
- Manual source indicator.

### Required Input Fields

- `activity_date`.
- `amount`.
- `movement_type`.
- Account reference.
- Category reference for income and expense.
- Local owner context, mapped to `user_id`.
- `source_indicator`, fixed or defaulted to `manual`.

### Optional Input Fields

- Category reference for transfer and adjustment.
- `description`.
- `merchant_or_payee`.
- `payment_method`.
- `transfer_pairing_note`.
- `source_system_name`.
- `source_record_reference`.

### Manual Input Field Mapping

- Local owner context maps to `finance_activities.user_id`.
- Date input maps to `finance_activities.activity_date`.
- Amount input maps to `finance_activities.amount`.
- Currency assumption maps to `finance_activities.currency = TWD`.
- Movement type input maps to `finance_activities.movement_type`.
- Account input maps to `finance_activities.account_id`.
- Category input maps to `finance_activities.category_id`.
- Note input maps to `finance_activities.description`.
- Merchant or payee input maps to `finance_activities.merchant_or_payee`.
- Payment method input maps to `finance_activities.payment_method`.
- Transfer note input maps to `finance_activities.transfer_pairing_note`.
- Manual source default maps to `finance_activities.source_indicator = manual`.
- Optional source labels map to `finance_activities.source_system_name` and `finance_activities.source_record_reference`.

### Validation Expectations Before Implementation

- `amount` must be positive.
- Currency remains TWD.
- `movement_type` must be one of income, expense, transfer, adjustment.
- Income and expense require category.
- Account and category references must belong to the same `user_id` as the activity.
- Manual logging should use active account and category references.
- `source_indicator` should be `manual`.
- Existing RLS ownership assumption remains `user_id = auth.uid()`.

### Usable Local Manual Logging Action Definition

A usable local manual logging action is one local-only manual input shape that can be mapped to a valid `finance_activities` record, tied to the local owner, one account, and, for income or expense, one category.

The action is usable only if it can stay within the existing Finance MVP schema and documented local-only boundaries without requiring schema, migration, config, App, API, Dashboard, Shortcut, seed, reporting, AI, Projection, or production work.

### Explicitly Out of Scope

- Code or command implementation.
- SQL migration or schema changes.
- Supabase configuration changes.
- Validation runs.
- Seed files or seed data.
- App, API, Dashboard, or Apple Shortcut work.
- Views, functions, triggers, or reporting tables.
- Production access.
- `service_role` key usage.
- Remote Supabase linking.
- Legacy Sheets/GAS porting.
- AI or Projection behavior.
- Version labels or production-ready claims.

### Open Questions Before Implementation

- Should the first manual interface identify accounts and categories by uuid, display name, or local alias?
- Should `source_indicator = manual` be implicit or explicitly entered?
- Which optional fields should be included in the first manual interface shape?
- Should transfer and adjustment be included in the first manual interface, or should implementation start with income and expense only?
- How should local-only active account and category validation be represented before App/API work exists?

### Recommended Next Issue

Validate local manual finance logging command shape.

## Remaining Open Questions

- What data model should represent these requirements?
- What checks are required before implementation begins?

## Next Boundary Work

- Prepare the first Finance MVP migration implementation issue.
- Keep production migration application out of scope until explicitly approved.
- Confirm Supabase CLI introduction, UUID default function, and exact RLS policy syntax during implementation.
