#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const DB_CONTAINER = "supabase_db_detabase";
const DOCKER = "docker";

const ACCOUNT_TYPES = new Set(["cash", "bank", "credit_card", "stored_value", "other"]);
const FLAGS = new Set([
  "user",
  "account-name",
  "account-type",
  "income-category-name",
  "expense-category-name",
  "income-grouping-purpose",
  "expense-grouping-purpose",
  "dry-run",
]);

function usage() {
  return [
    "Usage:",
    "  node scripts/local/setup-references.js --user <uuid> --account-name <name> --account-type <cash|bank|credit_card|stored_value|other> --income-category-name <name> --expense-category-name <name> [options]",
    "",
    "Options:",
    "  --income-grouping-purpose <text>",
    "  --expense-grouping-purpose <text>",
    "  --dry-run",
    "",
    "Local-only: connects to the local Supabase Postgres Docker container.",
    "This helper creates or identifies account/category references only; it does not insert finance activities.",
  ].join("\n");
}

function fail(message, details) {
  console.error(`ERROR: ${message}`);
  if (details) {
    console.error(details);
  }
  process.exit(1);
}

function parseBooleanFlag(name, value) {
  if (value === undefined) {
    return true;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  fail(`--${name} must be used without a value or with true/false`);
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];

    if (!raw.startsWith("--")) {
      fail(`Unexpected argument: ${raw}`, usage());
    }

    const eqIndex = raw.indexOf("=");
    const name = raw.slice(2, eqIndex === -1 ? undefined : eqIndex);
    let value = eqIndex === -1 ? undefined : raw.slice(eqIndex + 1);

    if (!FLAGS.has(name)) {
      fail(`Unknown option: --${name}`, usage());
    }

    if (Object.prototype.hasOwnProperty.call(parsed, name)) {
      fail(`Duplicate option: --${name}`);
    }

    if (name === "dry-run") {
      parsed[name] = parseBooleanFlag(name, value);
      continue;
    }

    if (value === undefined) {
      index += 1;
      value = argv[index];
    }

    if (value === undefined || value.startsWith("--")) {
      fail(`Missing value for --${name}`, usage());
    }

    parsed[name] = value;
  }

  return parsed;
}

function requireValue(input, key) {
  const value = input[key];
  if (typeof value !== "string" || value.trim() === "") {
    fail(`Missing required option: --${key}`, usage());
  }
  return value.trim();
}

function optionalText(input, key) {
  if (!Object.prototype.hasOwnProperty.call(input, key)) {
    return null;
  }

  const value = input[key].trim();
  if (value === "") {
    return null;
  }

  validateText(key, value);
  return value;
}

function validateText(label, value) {
  if (value.includes("\u0000")) {
    fail(`--${label} cannot contain NUL characters`);
  }
}

function validateUuid(label, value) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(value)) {
    fail(`--${label} must be a UUID`);
  }
  return value.toLowerCase();
}

function validateAccountType(value) {
  if (!ACCOUNT_TYPES.has(value)) {
    fail("--account-type must be one of cash, bank, credit_card, stored_value, other");
  }
  return value;
}

function validateDistinctCategories(incomeName, expenseName) {
  if (incomeName.toLocaleLowerCase() === expenseName.toLocaleLowerCase()) {
    fail("--income-category-name and --expense-category-name must be distinct for the first helper boundary");
  }
}

function sqlString(value) {
  if (value === null) {
    return "null";
  }
  return `'${value.replace(/'/g, "''")}'`;
}

function ensureLocalDbContainer() {
  const result = spawnSync(DOCKER, ["ps", "--format", "{{.Names}}"], {
    encoding: "utf8",
  });

  if (result.error) {
    fail("Docker is required for local Supabase Postgres access", result.error.message);
  }

  if (result.status !== 0) {
    fail("Could not inspect local Docker containers", result.stderr.trim());
  }

  const names = result.stdout.split(/\r?\n/).filter(Boolean);
  if (!names.includes(DB_CONTAINER)) {
    fail(
      `Local Supabase DB container is not running: ${DB_CONTAINER}`,
      "Start local Supabase before running this script."
    );
  }
}

function runSql(sql) {
  const result = spawnSync(
    DOCKER,
    [
      "exec",
      "-i",
      DB_CONTAINER,
      "psql",
      "--username",
      "postgres",
      "--dbname",
      "postgres",
      "--set",
      "ON_ERROR_STOP=1",
      "--quiet",
      "--tuples-only",
      "--no-align",
    ],
    {
      input: sql,
      encoding: "utf8",
    }
  );

  if (result.error) {
    fail("Could not execute local SQL", result.error.message);
  }

  if (result.status !== 0) {
    fail("Local reference setup failed", result.stderr.trim());
  }

  return result.stdout.trim();
}

function buildSetupSql(input) {
  const dryRun = input.dryRun ? "true" : "false";

  return `
with input as (
  select
    '${input.user}'::uuid as user_id,
    ${sqlString(input.accountName)}::text as account_name,
    '${input.accountType}'::text as account_type,
    ${sqlString(input.incomeCategoryName)}::text as income_category_name,
    ${sqlString(input.expenseCategoryName)}::text as expense_category_name,
    ${sqlString(input.incomeGroupingPurpose)}::text as income_grouping_purpose,
    ${sqlString(input.expenseGroupingPurpose)}::text as expense_grouping_purpose,
    ${dryRun}::boolean as dry_run
),
checks as (
  select
    exists (
      select 1
      from auth.users u
      where u.id = input.user_id
    ) as user_exists,
    (
      select count(*)::int
      from public.finance_accounts a
      where a.user_id = input.user_id
        and a.display_name = input.account_name
        and a.account_type = input.account_type
        and a.is_active = true
    ) as account_count,
    (
      select count(*)::int
      from public.finance_categories c
      where c.user_id = input.user_id
        and c.display_name = input.income_category_name
        and c.is_active = true
    ) as income_category_count,
    (
      select count(*)::int
      from public.finance_categories c
      where c.user_id = input.user_id
        and c.display_name = input.expense_category_name
        and c.is_active = true
    ) as expense_category_count
  from input
),
errors as (
  select
    case
      when not checks.user_exists
        then 'local owner user_id was not found in auth.users'
      when checks.account_count > 1
        then 'multiple active matching accounts found for this user, display name, and account type'
      when checks.income_category_count > 1
        then 'multiple active matching income categories found for this user and display name'
      when checks.expense_category_count > 1
        then 'multiple active matching expense categories found for this user and display name'
      else null
    end as reason
  from checks
),
account_existing as (
  select
    a.id,
    a.user_id,
    a.display_name,
    a.account_type,
    a.is_active,
    'already_existing'::text as status
  from public.finance_accounts a
  cross join input
  cross join checks
  cross join errors
  where errors.reason is null
    and checks.account_count = 1
    and a.user_id = input.user_id
    and a.display_name = input.account_name
    and a.account_type = input.account_type
    and a.is_active = true
),
account_inserted as (
  insert into public.finance_accounts (
    user_id,
    display_name,
    account_type,
    is_active
  )
  select
    input.user_id,
    input.account_name,
    input.account_type,
    true
  from input
  cross join checks
  cross join errors
  where errors.reason is null
    and not input.dry_run
    and checks.account_count = 0
  returning id, user_id, display_name, account_type, is_active, 'created'::text as status
),
account_result as (
  select * from account_existing
  union all
  select * from account_inserted
  union all
  select
    null::uuid as id,
    input.user_id,
    input.account_name as display_name,
    input.account_type,
    true as is_active,
    'would_create'::text as status
  from input
  cross join checks
  cross join errors
  where errors.reason is null
    and input.dry_run
    and checks.account_count = 0
),
income_existing as (
  select
    c.id,
    c.user_id,
    c.display_name,
    c.grouping_purpose,
    c.is_active,
    'already_existing'::text as status
  from public.finance_categories c
  cross join input
  cross join checks
  cross join errors
  where errors.reason is null
    and checks.income_category_count = 1
    and c.user_id = input.user_id
    and c.display_name = input.income_category_name
    and c.is_active = true
),
income_inserted as (
  insert into public.finance_categories (
    user_id,
    display_name,
    grouping_purpose,
    is_active
  )
  select
    input.user_id,
    input.income_category_name,
    input.income_grouping_purpose,
    true
  from input
  cross join checks
  cross join errors
  where errors.reason is null
    and not input.dry_run
    and checks.income_category_count = 0
  returning id, user_id, display_name, grouping_purpose, is_active, 'created'::text as status
),
income_result as (
  select * from income_existing
  union all
  select * from income_inserted
  union all
  select
    null::uuid as id,
    input.user_id,
    input.income_category_name as display_name,
    input.income_grouping_purpose as grouping_purpose,
    true as is_active,
    'would_create'::text as status
  from input
  cross join checks
  cross join errors
  where errors.reason is null
    and input.dry_run
    and checks.income_category_count = 0
),
expense_existing as (
  select
    c.id,
    c.user_id,
    c.display_name,
    c.grouping_purpose,
    c.is_active,
    'already_existing'::text as status
  from public.finance_categories c
  cross join input
  cross join checks
  cross join errors
  where errors.reason is null
    and checks.expense_category_count = 1
    and c.user_id = input.user_id
    and c.display_name = input.expense_category_name
    and c.is_active = true
),
expense_inserted as (
  insert into public.finance_categories (
    user_id,
    display_name,
    grouping_purpose,
    is_active
  )
  select
    input.user_id,
    input.expense_category_name,
    input.expense_grouping_purpose,
    true
  from input
  cross join checks
  cross join errors
  where errors.reason is null
    and not input.dry_run
    and checks.expense_category_count = 0
  returning id, user_id, display_name, grouping_purpose, is_active, 'created'::text as status
),
expense_result as (
  select * from expense_existing
  union all
  select * from expense_inserted
  union all
  select
    null::uuid as id,
    input.user_id,
    input.expense_category_name as display_name,
    input.expense_grouping_purpose as grouping_purpose,
    true as is_active,
    'would_create'::text as status
  from input
  cross join checks
  cross join errors
  where errors.reason is null
    and input.dry_run
    and checks.expense_category_count = 0
)
select json_build_object(
  'ok', errors.reason is null,
  'reason', errors.reason,
  'local_only', true,
  'dry_run', input.dry_run,
  'user_id', input.user_id,
  'same_owner', (
    errors.reason is null
    and account_result.user_id = input.user_id
    and income_result.user_id = input.user_id
    and expense_result.user_id = input.user_id
  ),
  'active_state_confirmed', (
    errors.reason is null
    and account_result.is_active = true
    and income_result.is_active = true
    and expense_result.is_active = true
  ),
  'references', json_build_object(
    'account', row_to_json(account_result),
    'income_category', row_to_json(income_result),
    'expense_category', row_to_json(expense_result)
  ),
  'manual_log_references',
    case
      when errors.reason is null
        and account_result.id is not null
        and income_result.id is not null
        and expense_result.id is not null
      then json_build_object(
        'income', json_build_object(
          'account', account_result.id,
          'category', income_result.id,
          'example', concat(
            'node scripts/local/manual-log.js --date <YYYY-MM-DD> --amount <positive-number> --type income --account ',
            account_result.id,
            ' --category ',
            income_result.id
          )
        ),
        'expense', json_build_object(
          'account', account_result.id,
          'category', expense_result.id,
          'example', concat(
            'node scripts/local/manual-log.js --date <YYYY-MM-DD> --amount <positive-number> --type expense --account ',
            account_result.id,
            ' --category ',
            expense_result.id
          )
        )
      )
      else null
    end
)::text
from input
cross join checks
cross join errors
left join account_result on true
left join income_result on true
left join expense_result on true;
`;
}

function main() {
  const rawInput = parseArgs(process.argv.slice(2));
  const accountName = requireValue(rawInput, "account-name");
  const incomeCategoryName = requireValue(rawInput, "income-category-name");
  const expenseCategoryName = requireValue(rawInput, "expense-category-name");

  validateText("account-name", accountName);
  validateText("income-category-name", incomeCategoryName);
  validateText("expense-category-name", expenseCategoryName);
  validateDistinctCategories(incomeCategoryName, expenseCategoryName);

  const input = {
    user: validateUuid("user", requireValue(rawInput, "user")),
    accountName,
    accountType: validateAccountType(requireValue(rawInput, "account-type")),
    incomeCategoryName,
    expenseCategoryName,
    incomeGroupingPurpose: optionalText(rawInput, "income-grouping-purpose"),
    expenseGroupingPurpose: optionalText(rawInput, "expense-grouping-purpose"),
    dryRun: Boolean(rawInput["dry-run"]),
  };

  ensureLocalDbContainer();

  const output = runSql(buildSetupSql(input));
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    fail("Local reference setup returned unexpected output", output);
  }

  if (!parsed.ok) {
    fail(parsed.reason || "Local reference setup failed");
  }

  console.log(JSON.stringify(parsed, null, 2));
}

main();
