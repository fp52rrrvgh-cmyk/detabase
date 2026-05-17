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

- Database schema.
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

## Legacy Material Usage Decision

Legacy Sheets + GAS may be used for import reference and comparison checks only.

Legacy formulas, field names, Apps Script logic, report behavior, and sheet structure are not the formal baseline.

## Remaining Open Questions

- What exact validation rules are required?
- What import identifiers are needed, if any?
- What data model should represent these requirements?
- What checks are required before implementation begins?

## Next Boundary Work

- Review the Finance MVP schema proposal.
- Decide whether the proposal can become a draft database schema in a later documentation step.
- Define implementation checks before any code or configuration work starts.
