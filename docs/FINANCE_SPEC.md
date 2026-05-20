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

### Local Command-Shape Validation Result

Issue #39 validated a temporary command/input shape locally against the existing Finance MVP schema.

Temporary shape:

```text
manual-log --date <YYYY-MM-DD> --amount <positive-number> --type <income|expense> --account <local-account-ref> --category <local-category-ref> [--description <text>] [--merchant-or-payee <text>] [--payment-method <text>] [--transfer-pairing-note <text>] [--source-system-name <text>] [--source-record-reference <text>]
```

The validation produced one valid local income record and one valid local expense record using the documented local manual interface boundary.

Required field mapping, optional field mapping, and local query checks by date, account, category, and `movement_type` passed.

The validation remained local-only and rollback-safe. Temporary records were inserted inside a local transaction and rolled back. No reusable command, script, API, App, Dashboard, Shortcut, seed data, reporting object, production workflow, AI, Projection, or legacy Sheets/GAS behavior was introduced.

### Local One-Off SQL Execution Validation Result

Issue #43 validated that one-off local SQL can successfully exercise the documented manual logging shape against the existing Finance MVP schema.

The one-off SQL produced one valid local income activity and one valid local expense activity. Required field mapping, optional field mapping, local queries by date, account, category, and `movement_type`, and rollback cleanup evidence passed.

This result does not introduce reusable tooling, a reusable command or script, seed data, formal reporting behavior, App, API, Dashboard, Shortcut, production workflow, AI, Projection, or legacy Sheets/GAS behavior.

Reusable command or script implementation remains out of scope unless explicitly approved.

## First Reusable Local Manual Logging Command/Script Boundary

This boundary defines how a first reusable local manual logging command or script may be considered later. It is documentation-only and does not implement a command, script, API, App, Dashboard, Shortcut, seed, reporting object, production workflow, AI, Projection, or legacy Sheets/GAS behavior.

### Recommended Boundary

A first reusable local manual logging command or script may be considered only as a local-only wrapper around the validated manual logging shape.

Its responsibility should be limited to accepting one manual finance logging input, validating the local input shape before insert, executing against the local Supabase database only, and reporting the inserted activity plus query or cleanup evidence.

The first reusable command or script should support income and expense only unless a later issue explicitly approves transfer or adjustment handling.

### Recommended Implementation Type To Evaluate Next

Evaluate a Node script next.

Node is preferred because it is cross-platform enough for this repository, keeps input parsing and validation in one small local tool, avoids binding the first reusable path to Windows-only PowerShell, and can be checked with `node --check`.

An npm wrapper should not be introduced until the underlying script boundary is implemented and validated.

### Why This Is The Smallest Safe Operational Step

The project has already validated that manual local input can map to valid `finance_activities` rows and that one-off SQL can execute that shape with rollback-safe evidence.

The next smallest step is to define the reusable local command/script boundary before any reusable file exists, so a future implementation issue has narrow, reviewable limits.

### Proposed Command/Input Contract

Proposed local command concept:

```text
manual-log --date <YYYY-MM-DD> --amount <positive-number> --type <income|expense> --account <local-account-ref> --category <local-category-ref> [--description <text>] [--merchant-or-payee <text>] [--payment-method <text>] [--source-system-name <text>] [--source-record-reference <text>]
```

Input contract:

- `date`: required; maps to `finance_activities.activity_date`.
- `amount`: required; must be positive; maps to `finance_activities.amount`.
- `type`: required; initially income or expense; maps to `finance_activities.movement_type`.
- `account`: required; resolves to a local `finance_accounts` reference owned by the local user.
- `category`: required for income and expense; resolves to a local `finance_categories` reference owned by the local user.
- `currency`: not user-entered in the first boundary; fixed to TWD.
- `source_indicator`: not user-entered in the first boundary; fixed or defaulted to `manual`.
- Optional context fields may map to `description`, `merchant_or_payee`, `payment_method`, `source_system_name`, and `source_record_reference`.

Output contract:

- Report whether input validation passed.
- Report whether insert succeeded.
- Report inserted activity identifier or selected row summary.
- Report query evidence by date, account, category, and `movement_type`.
- Report whether execution was dry-run, rollback, or persistent local insert, depending on the future issue scope.

### Allowed Files For A Future Implementation Issue

Recommended allowed files for a future implementation issue, if explicitly approved:

- One local script file under a clearly local tooling path, such as `scripts/local/manual-log.js`.
- A minimal documentation update only if the implementation issue explicitly allows it.

Files that should remain out of scope unless explicitly approved later:

- `package.json` or npm script exposure.
- SQL migration files.
- Supabase config files.
- Seed files.
- App, API, Dashboard, or Shortcut files.
- Reporting views, functions, triggers, or tables.

### Required Validation Expectations For A Future Implementation Issue

- Confirm the repo is on `origin/main` or the intended implementation branch.
- Confirm the working tree is clean before validation except for approved implementation files.
- Start local Supabase DB using existing config.
- Reset or replay the local database from existing migrations if needed.
- Run `node --check` for JavaScript.
- Validate the command or script can produce one valid local income activity.
- Validate the command or script can produce one valid local expense activity.
- Validate required field mapping.
- Validate optional field mapping for included optional inputs.
- Validate records can be queried by date, account, category, and `movement_type`.
- Validate same-owner account and category assumptions are preserved.
- Confirm no production access, `service_role` key, remote linking, migration or config change, seed data, reporting object, or App/API/Dashboard/Shortcut work occurs.
- Report working tree status after validation.

### Not Allowed Scope

- Reusable command or script implementation in this documentation step.
- SQL migration or schema changes.
- Supabase configuration changes.
- Validation runs.
- Seed files or seed data.
- App, API, Dashboard, or Apple Shortcut work.
- Reporting objects.
- Production access.
- `service_role` key usage.
- Remote Supabase linking.
- Legacy Sheets/GAS porting.
- AI or Projection behavior.
- Version labels or production-ready claims.

### Stop Conditions

Stop with `NEED_HUMAN` if this boundary requires schema changes, migration changes, Supabase config changes, production access, remote Supabase linking, `service_role` key usage, App/API/Dashboard/Shortcut decisions, seed data, reporting objects, reusable command/script implementation in this documentation step, legacy Sheets/GAS behavior, AI, or Projection scope.

### Recommended Next Issue

Validate or implement the first reusable local manual logging Node script only if explicitly approved; otherwise review the next operational boundary.

### First Reusable Local Manual Logging Script Implementation Result

PR #52 implemented the first reusable local manual logging Node script at `scripts/local/manual-log.js`.

The script remains local-only and supports income and expense only. It does not support transfer or adjustment.

The script accepts one manual finance logging input, validates the required local input shape, defaults currency to TWD, defaults `source_indicator` to `manual`, inserts one local `finance_activities` row, and reports an inserted row summary.

This implementation does not define App, API, Dashboard, Apple Shortcut, production workflow, AI, Projection, formal reporting behavior, or formal product behavior.

### Local Daily Logging Loop Validation Result

Issue #55 validated that the reusable local manual logging Node script can complete a minimal daily logging loop locally.

The validation used temporary local auth, account, and category records. The script inserted one income activity and one expense activity, and query validation passed by date, account, category, and `movement_type`.

Cleanup passed and finance table counts returned to zero after validation.

This validation does not define production workflow, App, API, Dashboard, Apple Shortcut, AI, Projection, formal workflow behavior, or formal product behavior.

Transfer and adjustment support remain out of scope unless explicitly approved by a dedicated issue.

## Local Account/Category Setup Workflow Boundary

This boundary defines the local-only reference data setup expected before stable manual logging with `scripts/local/manual-log.js`.

Account/category setup is prerequisite reference data for local manual logging. It is not formal onboarding, seed data, App/API/Dashboard/Shortcut behavior, production workflow, or reusable setup tooling.

### Local Account Setup Boundary

- Use the same local owner context as daily logging.
- Use active local accounts only for new manual logging.
- Keep account setup limited to existing Finance MVP schema fields.
- Treat account setup as local prerequisite reference data for `scripts/local/manual-log.js`, not as formal onboarding.

### Local Category Setup Boundary

- Use the same local owner context as activities and accounts.
- Have at least one active income category and one active expense category before stable local daily logging.
- Keep categories single-level only.
- Treat category setup as local prerequisite reference data for `scripts/local/manual-log.js`, not as formal onboarding.

### Minimum Required Account Fields

- `user_id`.
- `display_name`.
- `account_type`.
- `is_active = true`.
- `id` as the stable UUID reference.

### Minimum Required Category Fields

- `user_id`.
- `display_name`.
- `is_active = true`.
- `id` as the stable UUID reference.
- Optional `grouping_purpose`.

### Account/Category Identification Rule

- UUID is the first execution identifier for account and category references.
- Display name is human-readable confirmation only.
- Local alias support is deferred to a future dedicated issue.

This matches the current local manual logging script, which accepts `--account <uuid>` and `--category <uuid>`.

### Future Validation Expectations

A future validation issue should confirm:

- Active local accounts can be created or identified for the local owner.
- Active local categories can be created or identified for the same local owner.
- One income category and one expense category are available.
- `scripts/local/manual-log.js` can use selected account/category UUIDs for one income activity and one expense activity.
- Account/category references belong to the same `user_id` as activity records.
- Inactive account/category references are not used for new manual logging.
- Records remain queryable by date, account, category, and `movement_type`.
- Cleanup leaves no durable temporary validation data unless explicitly approved.

### Out of Scope

- Code or reusable setup tooling.
- Seed files or seed data.
- SQL migration or schema changes.
- Supabase configuration changes.
- Validation runs in this documentation step.
- App, API, Dashboard, or Apple Shortcut work.
- Production access.
- `service_role` key usage.
- Remote Supabase linking.
- Reporting objects.
- Legacy Sheets/GAS porting.
- AI or Projection behavior.
- Transfer or adjustment support expansion.
- Version labels or production-ready claims.

### Open Questions

- Should the first local account/category setup remain one-off SQL for validation only, or should it become documented manual runbook steps after validation?
- Which initial account display names and account types should be used for recurring local work?
- Which initial category display names and grouping purposes should be used for recurring local work?
- Should local category display names be unique by convention before App/API validation exists?
- Should local aliases be introduced later, and where should they live without changing schema?
- How should inactive accounts/categories be represented in a local setup checklist?

### Recommended Next Issue

Validate local account/category setup workflow boundary with temporary local references.

### Local Account/Category Setup Validation Result

Issue #64 validated the local account/category setup workflow boundary with temporary local references.

The validation confirmed:

- Temporary active local account/category references can support one local income activity through `scripts/local/manual-log.js`.
- Temporary active local account/category references can support one local expense activity through `scripts/local/manual-log.js`.
- The active account, active income category, and active expense category belonged to the same local owner context.
- Same-owner reference integrity passed for inserted activity records.
- Negative checks passed for inactive account, inactive category, and cross-owner category references.
- Inserted records remained queryable by date, account, category, and `movement_type`.
- Cleanup evidence passed; temporary accounts, categories, and activities were removed.

This validation remained local-only. It did not introduce code changes, scripts, reusable setup tooling, seed files, SQL migration changes, schema changes, Supabase config changes, production access, remote Supabase linking, `service_role` key usage, App/API/Dashboard/Shortcut work, reporting objects, AI, Projection, or legacy Sheets/GAS work.

### Recommended Next Issue After Validation

Define persistent local account/category setup method boundary.

## Persistent Local Account/Category Setup Method Boundary

Issue #67 completed recommendation-only boundary work for the persistent local account/category setup method.

### Recommended Persistent Method

The first persistent local account/category setup method boundary is documented runbook manual steps.

This method remains:

- Local-only.
- UUID-first for execution.
- Display-name-confirmed for human review only.
- Local-alias-deferred.
- Not onboarding.
- Not production workflow.
- Not App/API/Dashboard/Shortcut behavior.

### Method Options

- One-off SQL is not the recurring setup method; it remains validation-only or explicitly allowed issue work.
- Reusable local helper script setup is deferred.
- Seed-like setup is rejected for now.
- Schema, migration, and Supabase config changes remain out of scope.

### Minimum Setup Inputs

- Local owner context / `user_id`.
- Account `display_name`.
- Account `account_type`.
- Account `is_active = true`.
- Category `display_name`.
- Category `is_active = true`.
- Optional category `grouping_purpose`.

### Minimum Setup Outputs

- Active account UUID.
- Active income category UUID.
- Active expense category UUID.
- Display names for human confirmation.
- Evidence that selected account/category references belong to the same local owner context.

### Validation Expectations Before Implementation Or Helper Tooling

- One active account is available.
- One active income category is available.
- One active expense category is available.
- `scripts/local/manual-log.js` can use UUIDs for one income and one expense.
- Same-owner integrity passes.
- Inactive and cross-owner references are rejected.
- Records remain queryable by date, account, category, and `movement_type`.
- Cleanup removes temporary validation data.

### Deferred Options

- Reusable helper script.
- Seed-like setup.
- Local aliases.
- App/API/Dashboard/Shortcut setup flow.
- Production or staging workflow.
- Schema, migration, or Supabase config changes.

### Persistent Local Account/Category Setup Runbook Validation Result

Issue #70 validated the documented persistent local account/category setup runbook boundary with temporary local references.

The validation confirmed:

- The documented runbook manual setup boundary supported one active account, one active income category, and one active expense category.
- `scripts/local/manual-log.js` inserted one income activity and one expense activity using those UUID-first references.
- Same-owner integrity passed.
- Negative checks passed for inactive account, inactive category, and cross-owner category references.
- Query evidence passed by date, account, income category, expense category, and `movement_type`.
- Cleanup evidence passed; temporary accounts, categories, and activities were removed.

This validation remained local-only. It did not introduce repo file changes, code, scripts, reusable tooling, seed files, SQL migration changes, schema changes, Supabase config changes, production access, remote Supabase linking, `service_role` key usage, App/API/Dashboard/Shortcut work, reporting objects, AI, Projection, legacy Sheets/GAS work, versioning, or production-ready claims.

## Reusable Local Account/Category Setup Helper Boundary

Issue #73 completed recommendation-only boundary work for a reusable local account/category setup helper.

### Recommendation

A minimal reusable local account/category setup helper may be allowed next, but only through a dedicated implementation issue.

The helper must remain local-only and limited to account/category reference setup for `scripts/local/manual-log.js`.

It must not introduce seed files, schema changes, migration changes, Supabase config changes, App/API/Dashboard/Shortcut behavior, staging behavior, production access, remote Supabase access, or `service_role` usage.

### Helper Responsibility

The helper may:

- Create or identify one active local account.
- Create or identify one active income category.
- Create or identify one active expense category.
- Ensure all references belong to the same local owner context.
- Print UUIDs and display names for use with `scripts/local/manual-log.js`.
- Stay local-only.

The helper must:

- Use UUID-first execution identifiers.
- Keep display names as human confirmation only.
- Avoid local aliases for now.
- Stay limited to account/category reference setup.

The helper must not:

- Insert finance activities.
- Replace `scripts/local/manual-log.js`.
- Add aliases.
- Add seed files.
- Modify migrations, schema, or Supabase config.
- Add App/API/Dashboard/Shortcut behavior.
- Add staging, production, or remote Supabase behavior.

### Boundary-Level Input Contract

- Local owner context / `user_id`.
- Account display name.
- Account type.
- Income category display name.
- Expense category display name.
- Optional category grouping purpose.
- Optional dry-run flag if useful.

### Boundary-Level Output Contract

- Active account UUID and display name.
- Active income category UUID and display name.
- Active expense category UUID and display name.
- Same-owner confirmation.
- Active-state confirmation.
- Created versus already-existing status.
- Command-ready references for `scripts/local/manual-log.js`.

### Proposed Future Allowed Files

Allowed for a future implementation issue if explicitly approved:

- `scripts/local/setup-references.js`.
- `docs/RUNBOOK.md` only if the future implementation issue explicitly allows a docs update.

Out of scope unless separately approved:

- `package.json`.
- SQL migrations.
- Supabase config.
- Seed files.
- App/API/Dashboard/Shortcut files.
- Reporting objects.

### Future Implementation Validation Expectations

A future implementation issue should validate:

- `node --check scripts/local/setup-references.js`.
- Local Supabase DB-only startup using existing config.
- Local reset/replay only if explicitly allowed by that future issue.
- The helper creates or identifies one active account, one active income category, and one active expense category.
- Helper output UUIDs work with `scripts/local/manual-log.js` for one income and one expense.
- Same-owner integrity passes.
- Inactive and cross-owner references are not selected for new manual logging.
- Query evidence passes by date, account, category, and `movement_type`.
- Cleanup evidence or local reset removes temporary validation data.
- No production, remote Supabase, `service_role`, schema/migration/config, seed, App/API/Dashboard/Shortcut, reporting, AI, Projection, or legacy Sheets/GAS work occurs.

### Out of Scope

- Implementation in this documentation step.
- Code changes.
- Script or reusable tooling creation.
- Production or staging workflow.
- Remote Supabase linking.
- `service_role` usage.
- Schema, migration, or Supabase config changes.
- Seed files.
- App/API/Dashboard/Shortcut work.
- Reporting objects.
- Local aliases.
- AI or Projection behavior.
- Legacy Sheets/GAS work.
- Version labels.
- Production-ready claims.

### Open Questions Before Implementation

- Should the helper generate UUIDs through database defaults or accept explicit UUIDs for local validation?
- Should the helper only create missing records or also print existing matching records?
- Should duplicate display names cause stop/NEED_HUMAN?
- Should the helper support only one account plus two categories first?
- Should docs update be included in implementation or kept as a separate docs-sync issue?

### Recommended Next Issue

Implemented by PR #77; after local validation, define first practical local daily logging operator workflow.

### Reusable Local Account/Category Setup Helper Implementation Result

PR #77 implemented the reusable local account/category setup helper at `scripts/local/setup-references.js`.

The helper remains local-only and limited to account/category reference setup for `scripts/local/manual-log.js`. It creates or identifies one active local account, one active income category, and one active expense category for an existing local owner context, then prints UUIDs, display names, created versus already-existing status, same-owner confirmation, active-state confirmation, and command-ready references.

The helper does not insert finance activities, replace `scripts/local/manual-log.js`, add aliases, add seed files, modify migrations, schema, or Supabase config, or add App/API/Dashboard/Shortcut, staging, production, or remote Supabase behavior.

### Reusable Local Account/Category Setup Helper Validation Result

Issue #78 validated `scripts/local/setup-references.js` locally.

The validation confirmed:

- `node --check scripts/local/setup-references.js` passed.
- Helper create behavior passed: it created one active local account, one active income category, and one active expense category.
- Helper reuse behavior passed: a second run returned already-existing references.
- Helper dry-run behavior passed: dry-run reported would-create and made no writes.
- Helper output UUIDs worked with `scripts/local/manual-log.js` for one income activity and one expense activity.
- Negative checks passed for invalid UUID, invalid account type, duplicate active account ambiguity, duplicate active category ambiguity, inactive refs not selected, and cross-owner refs not selected.
- Query evidence passed for same-owner refs, date, account, income category, expense category, and `movement_type`.
- Cleanup evidence passed; temporary accounts, categories, activities, and local auth users were removed.

This validation remained local-only. It did not modify repo files or introduce code changes, scripts, reusable tooling, seed files, SQL migration changes, schema changes, Supabase config changes, production access, remote Supabase linking, `service_role` key usage, App/API/Dashboard/Shortcut work, reporting objects, AI, Projection, legacy Sheets/GAS work, versioning, or production-ready claims.

### Completed Next Issue After Helper Validation

Issue #81 defined the first practical local daily logging operator workflow at the recommendation-only boundary level.

## First Practical Local Daily Logging Operator Workflow

Issue #81 completed recommendation-only boundary work for the first practical local daily logging operator workflow.

No repo files, code, scripts, wrappers, aliases, seed files, migrations, schema changes, Supabase config changes, validation runs, package scripts, production access, remote Supabase linking, `service_role` key usage, App/API/Dashboard/Shortcut work, reporting objects, AI, Projection, legacy Sheets/GAS work, versioning, or production-ready claims were introduced during Issue #81.

The workflow stays local-only and uses the existing validated helpers as separate operator steps.

### Workflow Phases

Setup phase:

- Use `scripts/local/setup-references.js`.
- Use an existing local owner context / `user_id`.
- Provide account display name.
- Provide account type.
- Provide income category display name.
- Provide expense category display name.
- Optionally provide category grouping purpose.
- Output account/category UUIDs and display names.
- Output created versus already-existing status.
- Output same-owner confirmation.
- Output active-state confirmation.

Daily logging phase:

- Use `scripts/local/manual-log.js`.
- Provide activity date.
- Provide positive amount.
- Provide movement type: income or expense.
- Provide account UUID from the setup phase.
- Provide income or expense category UUID from the setup phase.
- Optionally provide description.
- Optionally provide merchant or payee.
- Optionally provide payment method.
- Optionally provide source system name and source record reference.

Confirmation/query phase:

- Review the inserted row summary printed by `scripts/local/manual-log.js`.
- Query by date when inspection is in scope.
- Query by account when inspection is in scope.
- Query by category when inspection is in scope.
- Query by `movement_type` when inspection is in scope.

Cleanup/maintenance phase:

- Clean temporary validation data when the workflow is used for validation.
- Allow persistent local operator references to remain only when intentionally used for recurring local work.
- Do not select inactive account/category references for new logging.
- Stop and require a human decision for duplicate active display-name ambiguity.
- Do not commit generated local Supabase metadata.

### Exact Role Of `scripts/local/setup-references.js`

`scripts/local/setup-references.js`:

- Creates or identifies account/category references.
- Prints UUIDs and display names.
- Prints created versus already-existing status.
- Prints same-owner and active-state confirmation.
- Prints command-ready references for `scripts/local/manual-log.js`.
- Does not insert finance activities.
- Does not replace `scripts/local/manual-log.js`.
- Does not add aliases.
- Does not use seed files.
- Does not touch production, staging, or remote Supabase.

### Exact Role Of `scripts/local/manual-log.js`

`scripts/local/manual-log.js`:

- Inserts one local `finance_activities` record.
- Uses UUID-first account/category references.
- Supports income and expense only.
- Defaults currency to `TWD`.
- Defaults `source_indicator` to `manual`.
- Reports an inserted row summary.
- Does not create account/category references.
- Does not support transfer or adjustment.
- Does not define App/API/Dashboard/Shortcut workflow.

### Minimum Operator Inputs

Minimum setup inputs:

- Local owner user id.
- Account display name.
- Account type.
- Income category display name.
- Expense category display name.
- Optional category grouping purpose.

Minimum daily logging inputs:

- Activity date.
- Amount.
- Movement type: income or expense.
- Account/category UUIDs from setup.

Optional note/context fields:

- Description.
- Merchant or payee.
- Payment method.
- Source system name.
- Source record reference.

### Minimum Operator Outputs

- Command-ready account UUID.
- Command-ready income category UUID.
- Command-ready expense category UUID.
- Display names for human confirmation.
- Same-owner confirmation.
- Active-state confirmation.
- Inserted activity summary.
- Query evidence when the issue scope includes query inspection.
- Cleanup or maintenance status when validation data is used.

### What Remains Manual

- Choosing account/category display names.
- Choosing account type.
- Deciding whether references are persistent local operator references or temporary validation data.
- Copying UUIDs from `scripts/local/setup-references.js` output into `scripts/local/manual-log.js` commands.
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
- Seed files or durable seed data.
- Automated recurring logging.
- Transfer or adjustment support.
- Reporting objects, views, functions, triggers, or reporting tables.
- AI or Projection behavior.
- Legacy Sheets/GAS porting.

### Validation Expectations Before Further UX Wrapper

A future validation issue should confirm:

- `scripts/local/setup-references.js` produces stable command-ready references.
- `scripts/local/manual-log.js` accepts helper output UUIDs for one income and one expense.
- Query evidence passes by date, account, category, and `movement_type`.
- Invalid UUIDs stop safely.
- Invalid account type stops safely.
- Duplicate active display-name ambiguity stops safely.
- Inactive refs are not selected for new logging.
- Cross-owner refs are not selected for the active local owner context.
- No production, remote Supabase, `service_role`, schema, migration, config, seed, App/API/Dashboard/Shortcut, reporting, AI, Projection, or legacy Sheets/GAS work occurs.

### Recommended Next Issue

Validate first practical local daily logging operator workflow.

## Remaining Open Questions

- What data model should represent these requirements?
- What checks are required before implementation begins?

## Next Boundary Work

- Prepare the first Finance MVP migration implementation issue.
- Keep production migration application out of scope until explicitly approved.
- Confirm Supabase CLI introduction, UUID default function, and exact RLS policy syntax during implementation.
