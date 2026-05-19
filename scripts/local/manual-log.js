#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const DB_CONTAINER = "supabase_db_detabase";
const DOCKER = "docker";

const FLAGS = new Set([
  "date",
  "amount",
  "type",
  "account",
  "category",
  "description",
  "merchant-or-payee",
  "payment-method",
  "source-system-name",
  "source-record-reference",
]);

function usage() {
  return [
    "Usage:",
    "  node scripts/local/manual-log.js --date <YYYY-MM-DD> --amount <positive-number> --type <income|expense> --account <uuid> --category <uuid> [options]",
    "",
    "Options:",
    "  --description <text>",
    "  --merchant-or-payee <text>",
    "  --payment-method <text>",
    "  --source-system-name <text>",
    "  --source-record-reference <text>",
    "",
    "Local-only: connects to the local Supabase Postgres Docker container.",
  ].join("\n");
}

function fail(message, details) {
  console.error(`ERROR: ${message}`);
  if (details) {
    console.error(details);
  }
  process.exit(1);
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

    if (value === undefined) {
      index += 1;
      value = argv[index];
    }

    if (value === undefined || value.startsWith("--")) {
      fail(`Missing value for --${name}`, usage());
    }

    if (Object.prototype.hasOwnProperty.call(parsed, name)) {
      fail(`Duplicate option: --${name}`);
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

function validateDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail("--date must use YYYY-MM-DD");
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail("--date must be a real calendar date");
  }

  return value;
}

function validateAmount(value) {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    fail("--amount must be a plain positive decimal number");
  }

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    fail("--amount must be greater than 0");
  }

  return value;
}

function validateType(value) {
  if (value !== "income" && value !== "expense") {
    fail("--type must be income or expense; transfer and adjustment are not supported by this local tool");
  }
  return value;
}

function validateUuid(label, value) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(value)) {
    fail(`--${label} must be a UUID`);
  }
  return value.toLowerCase();
}

function optionalText(input, key) {
  if (!Object.prototype.hasOwnProperty.call(input, key)) {
    return null;
  }

  const value = input[key].trim();
  if (value === "") {
    return null;
  }

  if (value.includes("\u0000")) {
    fail(`--${key} cannot contain NUL characters`);
  }

  return value;
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
    fail("Local insert failed", result.stderr.trim());
  }

  return result.stdout.trim();
}

function buildInsertSql(input) {
  return `
with refs as (
  select
    a.user_id,
    a.id as account_id,
    a.display_name as account_display_name,
    c.id as category_id,
    c.display_name as category_display_name
  from public.finance_accounts a
  join public.finance_categories c
    on c.user_id = a.user_id
   and c.id = '${input.category}'::uuid
   and c.is_active = true
  where a.id = '${input.account}'::uuid
    and a.is_active = true
),
inserted as (
  insert into public.finance_activities (
    user_id,
    activity_date,
    amount,
    currency,
    movement_type,
    account_id,
    category_id,
    description,
    source_indicator,
    source_system_name,
    source_record_reference,
    merchant_or_payee,
    payment_method
  )
  select
    refs.user_id,
    '${input.date}'::date,
    ${input.amount}::numeric,
    'TWD',
    '${input.type}',
    refs.account_id,
    refs.category_id,
    ${sqlString(input.description)},
    'manual',
    ${sqlString(input.sourceSystemName)},
    ${sqlString(input.sourceRecordReference)},
    ${sqlString(input.merchantOrPayee)},
    ${sqlString(input.paymentMethod)}
  from refs
  returning *
),
summary as (
  select json_build_object(
    'inserted', true,
    'id', inserted.id,
    'user_id', inserted.user_id,
    'activity_date', inserted.activity_date,
    'amount', inserted.amount,
    'currency', inserted.currency,
    'movement_type', inserted.movement_type,
    'account_id', inserted.account_id,
    'account_display_name', refs.account_display_name,
    'category_id', inserted.category_id,
    'category_display_name', refs.category_display_name,
    'description', inserted.description,
    'merchant_or_payee', inserted.merchant_or_payee,
    'payment_method', inserted.payment_method,
    'source_indicator', inserted.source_indicator,
    'source_system_name', inserted.source_system_name,
    'source_record_reference', inserted.source_record_reference
  )::text as payload
  from inserted
  join refs on refs.user_id = inserted.user_id
)
select coalesce(
  (select payload from summary),
  json_build_object(
    'inserted', false,
    'reason', 'active same-owner account and category references were not found'
  )::text
);
`;
}

function main() {
  const rawInput = parseArgs(process.argv.slice(2));

  const input = {
    date: validateDate(requireValue(rawInput, "date")),
    amount: validateAmount(requireValue(rawInput, "amount")),
    type: validateType(requireValue(rawInput, "type")),
    account: validateUuid("account", requireValue(rawInput, "account")),
    category: validateUuid("category", requireValue(rawInput, "category")),
    description: optionalText(rawInput, "description"),
    merchantOrPayee: optionalText(rawInput, "merchant-or-payee"),
    paymentMethod: optionalText(rawInput, "payment-method"),
    sourceSystemName: optionalText(rawInput, "source-system-name"),
    sourceRecordReference: optionalText(rawInput, "source-record-reference"),
  };

  ensureLocalDbContainer();

  const output = runSql(buildInsertSql(input));
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch (error) {
    fail("Local insert returned unexpected output", output);
  }

  if (!parsed.inserted) {
    fail(parsed.reason || "No finance activity was inserted");
  }

  console.log(JSON.stringify(parsed, null, 2));
}

main();
