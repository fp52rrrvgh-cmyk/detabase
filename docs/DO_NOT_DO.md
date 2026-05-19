# Do Not Do

## Current Restrictions

- Do not add app code.
- Do not add database schema changes outside a dedicated migration issue.
- Do not add Supabase configuration unless explicitly approved.
- Do not add dashboard code.
- Do not add API or Edge Function code.
- Do not add Apple Shortcut code.
- Do not import or port legacy Sheets/GAS logic.
- Do not add seed data unless explicitly approved.
- Do not add reusable command or script implementation unless explicitly approved.
- Do not add formal reporting behavior, views, functions, triggers, or reporting tables unless explicitly approved.
- Do not introduce a daily logging workflow unless explicitly approved.
- Do not add Projection or AI behavior unless explicitly approved.
- Do not add version numbers.
- Do not declare the project production-ready.
- Do not add extra governance documents without an explicit request.
- Do not access or modify the production database.
- Do not use a `service_role` key.
- Do not link a remote Supabase project unless explicitly approved.
- Do not run destructive migrations unless explicitly approved.
- Local-only migration work is allowed only by a dedicated issue that explicitly permits it.
- Keep validation and fixes separate.
- Schema, migration, or Supabase config changes require a dedicated issue.

## High-Risk Areas

- Formal data model.
- Write flows.
- Core headers.
- Migration or legacy retirement.
- Deployment setup.
