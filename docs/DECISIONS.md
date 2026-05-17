# Decisions

## Accepted

- Keep source of truth documentation in `docs/`.
- Keep this initial pass limited to documentation skeletons.
- For the Finance MVP, legacy Sheets + GAS may be used for import reference and comparison checks only, and is not the formal baseline.
- For the Finance MVP, accepted money movement types are income, expense, transfer, and adjustment.
- For the Finance MVP, accepted account roles or types are cash, bank, credit_card, stored_value, and other.
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

## Pending

- Architecture decisions.
- Data model decisions.
- Deployment decisions.
- Migration decisions.
