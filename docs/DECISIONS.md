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

## Pending

- Architecture decisions.
- Data model decisions.
- Deployment decisions.
- Migration decisions.
