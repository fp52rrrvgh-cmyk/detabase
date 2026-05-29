-- Classification rules engine: auto-map keywords → category + account
-- User-defined rules for automatic classification during quick capture.
-- Each rule matches a keyword against the transaction description.
-- When a description matches multiple rules, the most specific (longest keyword) wins.
-- Only enabled rules are considered during matching.

create table if not exists public.finance_classification_rules (
  id            uuid not null default gen_random_uuid(),
  user_id       uuid not null default auth.uid(),
  keyword       text not null check (char_length(keyword) >= 1 and char_length(keyword) <= 100),
  category_id   uuid,
  account_id    uuid,
  movement_type text check (movement_type is null or movement_type in ('expense', 'income')),
  is_enabled    boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint finance_classification_rules_pkey primary key (id),

  constraint finance_classification_rules_category_fkey
    foreign key (category_id) references public.finance_categories(id)
    on delete set null,

  constraint finance_classification_rules_account_fkey
    foreign key (account_id) references public.finance_accounts(id)
    on delete set null

  -- NOTE: keyword itself is intentionally NOT unique, multiple rules may point
  -- to different category/account combos for the same keyword (user can pick).
  -- Matching picks the longest keyword match, so 'costco' vs 'costco加油' both work.
);

-- Index for lookup: enabled rules for a user, sorted by keyword length desc
-- This is the primary query: "find all my rules where keyword matches this text"
create index if not exists finance_classification_rules_user_enabled_idx
  on public.finance_classification_rules (user_id, is_enabled)
  where is_enabled = true;

-- RLS
alter table public.finance_classification_rules enable row level security;

create policy "Users can view own rules"
  on public.finance_classification_rules for select
  using (auth.uid() = user_id);

create policy "Users can insert own rules"
  on public.finance_classification_rules for insert
  with check (auth.uid() = user_id);

create policy "Users can update own rules"
  on public.finance_classification_rules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own rules"
  on public.finance_classification_rules for delete
  using (auth.uid() = user_id);

-- Grant table-level permissions to authenticated role (needed for RLS via REST API)
grant select, insert, update, delete on public.finance_classification_rules to authenticated;
