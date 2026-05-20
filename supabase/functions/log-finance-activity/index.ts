import { createClient } from "npm:@supabase/supabase-js@2";

const FUNCTION_NAME = "log-finance-activity";
const REQUIRED_ENVIRONMENT_LABEL = "staging";
const DEFAULT_CURRENCY = "TWD";
const SOURCE_INDICATOR = "manual";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_FIELDS = new Set([
  "activity_date",
  "movement_type",
  "amount",
  "currency",
  "account_id",
  "category_id",
  "description",
  "merchant_or_payee",
  "payment_method",
  "source_system_name",
  "source_record_reference",
]);

type JsonObject = Record<string, unknown>;
type MovementType = "income" | "expense";
type SupabaseClient = ReturnType<typeof createClient>;
type CallerClient = {
  accessToken: string;
  supabase: SupabaseClient;
};

type ValidatedInput = {
  activityDate: string;
  movementType: MovementType;
  amount: string;
  currency: "TWD";
  accountId: string;
  categoryId: string;
  description: string | null;
  merchantOrPayee: string | null;
  paymentMethod: string | null;
  sourceSystemName: string | null;
  sourceRecordReference: string | null;
};

type FinanceAccount = {
  id: string;
  user_id: string;
  display_name: string;
  is_active: boolean;
};

type FinanceCategory = {
  id: string;
  user_id: string;
  display_name: string;
  grouping_purpose: string | null;
  is_active: boolean;
};

type SafeFailureCode =
  | "method_not_allowed"
  | "invalid_json"
  | "invalid_request"
  | "missing_authorization"
  | "unauthorized"
  | "runtime_not_configured"
  | "environment_not_allowed"
  | "invalid_account_reference"
  | "invalid_category_reference"
  | "category_movement_mismatch"
  | "reference_lookup_failed"
  | "insert_failed"
  | "internal_error";

function jsonResponse(status: number, body: JsonObject): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function safeFailure(
  status: number,
  code: SafeFailureCode,
  message: string,
): Response {
  return jsonResponse(status, {
    ok: false,
    error: {
      code,
      message,
    },
  });
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rejectUnsupportedFields(body: JsonObject): Response | null {
  for (const key of Object.keys(body)) {
    if (!ALLOWED_FIELDS.has(key)) {
      return safeFailure(
        400,
        "invalid_request",
        `Unsupported field: ${key}`,
      );
    }
  }

  return null;
}

function requireField(body: JsonObject, key: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(body, key)) {
    throw new Error(`Missing required field: ${key}`);
  }

  const value = body[key];
  if (value === null || value === undefined) {
    throw new Error(`Missing required field: ${key}`);
  }

  if (typeof value === "string" && value.trim() === "") {
    throw new Error(`Missing required field: ${key}`);
  }

  return value;
}

function validateDate(value: unknown): string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("activity_date must use YYYY-MM-DD");
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error("activity_date must be a real calendar date");
  }

  return value;
}

function validateMovementType(value: unknown): MovementType {
  if (value !== "income" && value !== "expense") {
    throw new Error("movement_type must be income or expense");
  }

  return value;
}

function validateAmount(value: unknown): string {
  const raw =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : "";

  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw)) {
    throw new Error("amount must be a positive decimal number");
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("amount must be greater than 0");
  }

  return raw;
}

function validateUuid(field: string, value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${field} must be a UUID`);
  }

  return value.toLowerCase();
}

function validateCurrency(value: unknown): "TWD" {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_CURRENCY;
  }

  if (typeof value !== "string" || value.trim() !== DEFAULT_CURRENCY) {
    throw new Error("currency must be TWD when provided");
  }

  return DEFAULT_CURRENCY;
}

function optionalText(body: JsonObject, key: string): string | null {
  if (!Object.prototype.hasOwnProperty.call(body, key)) {
    return null;
  }

  const value = body[key];
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${key} must be a string when provided`);
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }

  if (trimmed.includes("\u0000")) {
    throw new Error(`${key} cannot contain NUL characters`);
  }

  return trimmed;
}

function validateInput(body: JsonObject): ValidatedInput {
  const unsupported = rejectUnsupportedFields(body);
  if (unsupported) {
    throw unsupported;
  }

  return {
    activityDate: validateDate(requireField(body, "activity_date")),
    movementType: validateMovementType(requireField(body, "movement_type")),
    amount: validateAmount(requireField(body, "amount")),
    currency: validateCurrency(body.currency),
    accountId: validateUuid("account_id", requireField(body, "account_id")),
    categoryId: validateUuid("category_id", requireField(body, "category_id")),
    description: optionalText(body, "description"),
    merchantOrPayee: optionalText(body, "merchant_or_payee"),
    paymentMethod: optionalText(body, "payment_method"),
    sourceSystemName: optionalText(body, "source_system_name"),
    sourceRecordReference: optionalText(body, "source_record_reference"),
  };
}

function getPublishableKey(): string | null {
  const publishableKeys = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (publishableKeys) {
    try {
      const parsed = JSON.parse(publishableKeys);
      if (isJsonObject(parsed) && typeof parsed.default === "string") {
        return parsed.default;
      }
    } catch {
      return null;
    }
  }

  return Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    null;
}

function enforceStagingRuntime(): Response | null {
  const environmentLabel = Deno.env.get("DETABASE_ENVIRONMENT");

  if (environmentLabel !== REQUIRED_ENVIRONMENT_LABEL) {
    return safeFailure(
      403,
      "environment_not_allowed",
      "This function is enabled only for the staging runtime.",
    );
  }

  return null;
}

function extractBearerToken(req: Request): string | Response {
  const authorization = req.headers.get("authorization")?.trim();

  if (!authorization) {
    return safeFailure(
      401,
      "missing_authorization",
      "Authorization bearer token is required.",
    );
  }

  const [scheme, token, extra] = authorization.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    return safeFailure(
      401,
      "missing_authorization",
      "Authorization bearer token is required.",
    );
  }

  return token;
}

function createCallerClient(req: Request): CallerClient | Response {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getPublishableKey();
  const accessToken = extractBearerToken(req);

  if (accessToken instanceof Response) {
    return accessToken;
  }

  if (!supabaseUrl || !publishableKey) {
    return safeFailure(
      500,
      "runtime_not_configured",
      "The function runtime is not configured for safe staging access.",
    );
  }

  const authorization = `Bearer ${accessToken}`;
  const supabase = createClient(supabaseUrl, publishableKey, {
    accessToken: async () => accessToken,
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  return {
    accessToken,
    supabase,
  };
}

async function resolveUserId(caller: CallerClient): Promise<string | Response> {
  const { data, error } = await caller.supabase.auth.getUser(caller.accessToken);

  if (error || !data.user?.id) {
    return safeFailure(
      401,
      "unauthorized",
      "Caller identity could not be resolved.",
    );
  }

  return data.user.id;
}

async function findActiveAccount(
  caller: CallerClient,
  userId: string,
  accountId: string,
): Promise<FinanceAccount | Response> {
  const { data, error } = await caller.supabase
    .from("finance_accounts")
    .select("id,user_id,display_name,is_active")
    .eq("id", accountId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return safeFailure(
      500,
      "reference_lookup_failed",
      "Account reference could not be checked safely.",
    );
  }

  if (!data) {
    return safeFailure(
      422,
      "invalid_account_reference",
      "Active same-owner account reference was not found.",
    );
  }

  return data as FinanceAccount;
}

async function findActiveCategory(
  caller: CallerClient,
  userId: string,
  categoryId: string,
): Promise<FinanceCategory | Response> {
  const { data, error } = await caller.supabase
    .from("finance_categories")
    .select("id,user_id,display_name,grouping_purpose,is_active")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    return safeFailure(
      500,
      "reference_lookup_failed",
      "Category reference could not be checked safely.",
    );
  }

  if (!data) {
    return safeFailure(
      422,
      "invalid_category_reference",
      "Active same-owner category reference was not found.",
    );
  }

  return data as FinanceCategory;
}

function categoryMatchesMovement(
  category: FinanceCategory,
  movementType: MovementType,
): boolean {
  return category.grouping_purpose?.trim().toLowerCase() === movementType;
}

async function insertActivity(
  caller: CallerClient,
  userId: string,
  input: ValidatedInput,
): Promise<JsonObject | Response> {
  const { data, error } = await caller.supabase
    .from("finance_activities")
    .insert({
      user_id: userId,
      activity_date: input.activityDate,
      amount: input.amount,
      currency: input.currency,
      movement_type: input.movementType,
      account_id: input.accountId,
      category_id: input.categoryId,
      description: input.description,
      source_indicator: SOURCE_INDICATOR,
      source_system_name: input.sourceSystemName,
      source_record_reference: input.sourceRecordReference,
      merchant_or_payee: input.merchantOrPayee,
      payment_method: input.paymentMethod,
    })
    .select(
      [
        "id",
        "activity_date",
        "amount",
        "currency",
        "movement_type",
        "account_id",
        "category_id",
        "source_indicator",
      ].join(","),
    )
    .single();

  if (error || !data) {
    return safeFailure(
      500,
      "insert_failed",
      "Finance activity could not be inserted safely.",
    );
  }

  return data as JsonObject;
}

export async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: {
            code: "method_not_allowed",
            message: "Only POST requests are supported.",
          },
        }),
        {
          status: 405,
          headers: {
            ...JSON_HEADERS,
            allow: "POST",
          },
        },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return safeFailure(400, "invalid_json", "Request body must be valid JSON.");
    }

    if (!isJsonObject(body)) {
      return safeFailure(400, "invalid_request", "Request body must be a JSON object.");
    }

    let input: ValidatedInput;
    try {
      input = validateInput(body);
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }

      return safeFailure(
        400,
        "invalid_request",
        error instanceof Error ? error.message : "Request validation failed.",
      );
    }

    const stagingRuntimeFailure = enforceStagingRuntime();
    if (stagingRuntimeFailure) {
      return stagingRuntimeFailure;
    }

    const caller = createCallerClient(req);
    if (caller instanceof Response) {
      return caller;
    }

    const userId = await resolveUserId(caller);
    if (userId instanceof Response) {
      return userId;
    }

    const account = await findActiveAccount(caller, userId, input.accountId);
    if (account instanceof Response) {
      return account;
    }

    const category = await findActiveCategory(caller, userId, input.categoryId);
    if (category instanceof Response) {
      return category;
    }

    if (!categoryMatchesMovement(category, input.movementType)) {
      return safeFailure(
        422,
        "category_movement_mismatch",
        "Category reference does not match the requested movement type.",
      );
    }

    const inserted = await insertActivity(caller, userId, input);
    if (inserted instanceof Response) {
      return inserted;
    }

    return jsonResponse(201, {
      ok: true,
      activity: inserted,
      validation: {
        source: FUNCTION_NAME,
        account_reference: {
          id: account.id,
          active: account.is_active,
          same_owner: account.user_id === userId,
        },
        category_reference: {
          id: category.id,
          active: category.is_active,
          same_owner: category.user_id === userId,
          grouping_purpose: category.grouping_purpose,
        },
      },
    });
  } catch {
    console.error(`${FUNCTION_NAME}: internal_error`);
    return safeFailure(
      500,
      "internal_error",
      "Request could not be processed safely.",
    );
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
