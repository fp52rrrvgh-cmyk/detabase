import type { RuntimeConfig } from "./types";

export const RUNTIME_ENVIRONMENT_FIELDS: Array<{
  name: string;
  key: keyof RuntimeConfig;
}> = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", key: "supabaseUrl" },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key: "publishableKey" },
  { name: "NEXT_PUBLIC_FINANCE_FUNCTION_URL", key: "functionUrl" },
  { name: "NEXT_PUBLIC_DEFAULT_EXPENSE_ACCOUNT_ID", key: "expenseAccountId" },
  { name: "NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID", key: "expenseCategoryId" },
  { name: "NEXT_PUBLIC_DEFAULT_INCOME_ACCOUNT_ID", key: "incomeAccountId" },
  { name: "NEXT_PUBLIC_DEFAULT_INCOME_CATEGORY_ID", key: "incomeCategoryId" },
];

export const CORE_RUNTIME_KEYS: Array<keyof RuntimeConfig> = [
  "supabaseUrl",
  "publishableKey",
  "functionUrl",
];

export const EXPENSE_RUNTIME_KEYS: Array<keyof RuntimeConfig> = [
  ...CORE_RUNTIME_KEYS,
  "expenseAccountId",
  "expenseCategoryId",
];

export const INCOME_RUNTIME_KEYS: Array<keyof RuntimeConfig> = [
  ...CORE_RUNTIME_KEYS,
  "incomeAccountId",
  "incomeCategoryId",
];

export const REQUEST_FAILURE_MESSAGE =
  "網路或服務請求發生問題，請稍後再試。";

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const runtimeConfig: RuntimeConfig = {
  supabaseUrl: typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") : "",
  publishableKey: typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "") : "",
  functionUrl: typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_FINANCE_FUNCTION_URL ?? "") : "",
  supabaseFunctionsUrl: typeof process !== "undefined"
    ? ((process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "") + "/functions/v1")
    : "",
  expenseAccountId: typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_DEFAULT_EXPENSE_ACCOUNT_ID ?? "") : "",
  expenseCategoryId: typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID ?? "") : "",
  incomeAccountId: typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_DEFAULT_INCOME_ACCOUNT_ID ?? "") : "",
  incomeCategoryId: typeof process !== "undefined" ? (process.env.NEXT_PUBLIC_DEFAULT_INCOME_CATEGORY_ID ?? "") : "",
};
