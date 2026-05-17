# Finance Spec

## MVP Goal

Define the first finance module boundary for tracking personal financial activity at a documentation level.

The MVP should make it possible to capture basic finance records, review them, and identify what decisions are still needed before any implementation work starts.

## In Scope

- Transaction-like records for personal money movement.
- Account-like records as labels or references for where money is held or used.
- Category-like records as labels or references for grouping activity.
- Basic review views or summaries at the requirements level only.
- Import reference notes for legacy Sheets + GAS material, without treating legacy structure or logic as the formal baseline.

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
- Legacy Sheets + GAS may be reviewed as reference or import material only.

## First Review and Reporting Assumptions

- The first review flow should help inspect captured finance activity.
- Reporting should remain lightweight until required fields and grouping rules are decided.
- Any totals, summaries, or charts remain requirements placeholders until the data model is chosen.

## Open Questions Requiring User Decision

- Which money movement types are required first?
- Which account labels or references are required first?
- Which category labels or references are required first?
- What minimum record details are required before implementation can begin?
- What review summary is most important first?
- Should legacy Sheets + GAS be used only for import reference, or also for comparison checks?

## Next Boundary Work

- Confirm the first finance record types.
- Confirm the minimum record details.
- Confirm the first review summary.
- Decide whether legacy material is needed for reference before implementation starts.
