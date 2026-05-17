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
| `id` | identifier | yes | Stable account reference identifier. |
| `display_name` | text | yes | User-facing account name. |
| `account_type` | enum-like text | yes | One of cash, bank, credit_card, stored_value, other. |
| `is_active` | boolean | yes | Indicates whether the account is available for new manual entries. |
| `created_at` | timestamp | yes | Record creation time. |
| `updated_at` | timestamp | yes | Last update time. |

#### `finance_categories`

| Column | Documentation-level type | Required | Purpose |
| --- | --- | --- | --- |
| `id` | identifier | yes | Stable category reference identifier. |
| `display_name` | text | yes | User-facing category name. |
| `grouping_purpose` | text | no | Optional note for the single-level grouping purpose. |
| `is_active` | boolean | yes | Indicates whether the category is available for new manual entries. |
| `created_at` | timestamp | yes | Record creation time. |
| `updated_at` | timestamp | yes | Last update time. |

#### `finance_activities`

| Column | Documentation-level type | Required | Purpose |
| --- | --- | --- | --- |
| `id` | identifier | yes | Stable activity identifier. |
| `activity_date` | date | yes | Date of the activity. |
| `amount` | decimal number | yes | Activity amount. |
| `currency` | enum-like text | yes | Fixed to TWD for the first implementation. |
| `movement_type` | enum-like text | yes | One of income, expense, transfer, adjustment. |
| `account_id` | identifier reference | yes | References the related account. |
| `category_id` | identifier reference | conditional | Required for expense and income; optional for transfer and adjustment. |
| `description` | text | no | Short description or note. |
| `source_indicator` | enum-like text | yes | Indicates manual entry, import reference, or comparison reference. |
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
- `finance_accounts` and `finance_categories` are reference tables and do not depend on `finance_activities`.
- Transfer remains represented as one `finance_activities` record for the first implementation.

These relationships are draft documentation only and are not final foreign key definitions.

### Proposed Constraints

- `finance_accounts.account_type` should be limited to cash, bank, credit_card, stored_value, other.
- `finance_activities.movement_type` should be limited to income, expense, transfer, adjustment.
- `finance_activities.currency` should be fixed to TWD for the first implementation.
- `finance_activities.amount` should be present for every activity.
- `finance_activities.account_id` should be present for every activity.
- `finance_activities.category_id` should be present for expense and income.
- `finance_categories.display_name` should be unique among active categories unless a future decision allows duplicates.
- New manual entries should not use inactive account or category references.
- Historical records may keep inactive account or category references.

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
- Access should be scoped to the owning user if multi-user storage is ever introduced.
- No shared workspace, team access, or public access is assumed for the Finance MVP.
- RLS policy details are not defined in this documentation step.

### Remaining Questions Before Migration Work

- Should identifiers be UUIDs or another identifier type?
- Should period-based review be derived from `activity_date`, or should a separate period field be introduced later?
- Should `amount` store signed values, positive values with movement type, or another representation?
- Should `source_indicator` allowed values be finalized before migration work?
- Should inactive-reference rules be enforced in database constraints, application logic, or both?
- Which proposed indexes are actually needed for the first queries?
- What RLS policy shape is required if Supabase is used later?

## Legacy Material Usage Decision

Legacy Sheets + GAS may be used for import reference and comparison checks only.

Legacy formulas, field names, Apps Script logic, report behavior, and sheet structure are not the formal baseline.

## Remaining Open Questions

- What data model should represent these requirements?
- What checks are required before implementation begins?

## Next Boundary Work

- Review the Finance MVP draft database schema documentation.
- Decide whether the draft database schema documentation can proceed to a migration planning step.
- Define implementation checks before any code or configuration work starts.
