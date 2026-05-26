const FUNCTION_NAME = "set-budget";
const REQUIRED_ENVIRONMENT_LABEL = "staging";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};
const ALLOWED_CORS_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://web-two-gamma-aorcvaarvn.vercel.app",
]);
const DEFAULT_CORS_ORIGIN = "http://localhost:3000";
const CORS_METHODS = "POST, OPTIONS";
const CORS_HEADERS = "authorization, x-client-info, apikey, content-type";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type JsonObject = Record<string, unknown>;
type CallerContext = {
  accessToken: string;
  supabaseUrl: string;
  publishableKey: string;
};

type SafeFailureCode =
  | "method_not_allowed"
  | "invalid_json"
  | "invalid_request"
  | "missing_authorization"
  | "unauthorized"
  | "runtime_not_configured"
  | "environment_not_allowed"
  | "invalid_category_reference"
  | "upsert_failed"
  | "internal_error";

function jsonResponse(status: number, body: JsonObject): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: JSON_HEADERS,
  });
}

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  const allowedOrigin = origin && ALLOWED_CORS_ORIGINS.has(origin)
    ? origin
    : DEFAULT_CORS_ORIGIN;

  return {
    "access-control-allow-origin": allowedOrigin,
    "access-control-allow-methods": CORS_METHODS,
    "access-control-allow-headers": CORS_HEADERS,
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function withCors(req: Request, response: Response): Response {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(corsHeaders(req))) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function preflightResponse(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(req),
      "access-control-max-age": "86400",
    },
  });
}

function safeFailure(
  status: number,
  code: SafeFailureCode,
  message: string,
): Response {
  return jsonResponse(status, {
    ok: false,
    error: { code, message },
  });
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function validateUuid(field: string, value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error(`${field} must be a UUID`);
  }
  return value.toLowerCase();
}

function validateYear(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("budget_year must be an integer");
  }
  if (value < 2020 || value > 2099) {
    throw new Error("budget_year must be between 2020 and 2099");
  }
  return value;
}

function validateMonth(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("budget_month must be an integer");
  }
  if (value < 1 || value > 12) {
    throw new Error("budget_month must be between 1 and 12");
  }
  return value;
}

function validateLimitAmount(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new Error("limit_amount must be a positive integer");
  }
  if (value <= 0) {
    throw new Error("limit_amount must be greater than 0");
  }
  return value;
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

function normalizeSupabaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
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
    return safeFailure(401, "missing_authorization", "Authorization bearer token is required.");
  }
  const [scheme, token, extra] = authorization.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    return safeFailure(401, "missing_authorization", "Authorization bearer token is required.");
  }
  return token;
}

function createCallerContext(req: Request): CallerContext | Response {
  const rawSupabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getPublishableKey();
  const accessToken = extractBearerToken(req);

  if (accessToken instanceof Response) return accessToken;

  if (!rawSupabaseUrl || !publishableKey) {
    return safeFailure(500, "runtime_not_configured", "The function runtime is not configured for safe staging access.");
  }

  return {
    accessToken,
    supabaseUrl: normalizeSupabaseUrl(rawSupabaseUrl),
    publishableKey,
  };
}

function callerHeaders(caller: CallerContext): Record<string, string> {
  return {
    apikey: caller.publishableKey,
    Authorization: `Bearer ${caller.accessToken}`,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function resolveUserId(caller: CallerContext): Promise<string | Response> {
  const response = await fetch(`${caller.supabaseUrl}/auth/v1/user`, {
    headers: callerHeaders(caller),
  });
  const data = await readJson(response);

  if (!response.ok || !isJsonObject(data) || typeof data.id !== "string") {
    return safeFailure(401, "unauthorized", "Caller identity could not be resolved.");
  }
  return data.id;
}

async function upsertBudget(
  caller: CallerContext,
  userId: string,
  categoryId: string,
  budgetYear: number,
  budgetMonth: number,
  limitAmount: number,
): Promise<Response | null> {
  const url = new URL(`${caller.supabaseUrl}/rest/v1/finance_budgets`);
  url.searchParams.set("on_conflict", "user_id,category_id,budget_year,budget_month");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      ...callerHeaders(caller),
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      user_id: userId,
      category_id: categoryId,
      budget_year: budgetYear,
      budget_month: budgetMonth,
      limit_amount: limitAmount,
    }),
  });

  if (!response.ok) {
    const body = await readJson(response);
    console.error(`[${FUNCTION_NAME}] upsert failed:`, JSON.stringify(body));
    return safeFailure(500, "upsert_failed", "Budget could not be saved.");
  }

  return null;
}

async function resolveCategory(
  caller: CallerContext,
  userId: string,
  categoryId: string,
): Promise<Response | null> {
  const url = new URL(`${caller.supabaseUrl}/rest/v1/finance_categories`);
  url.searchParams.set("id", `eq.${categoryId}`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.set("select", "id");
  url.searchParams.set("limit", "1");

  const response = await fetch(url.toString(), {
    headers: callerHeaders(caller),
  });
  const data = await readJson(response);

  if (!response.ok || !Array.isArray(data) || data.length === 0) {
    return safeFailure(422, "invalid_category_reference", "Active same-owner category was not found.");
  }
  return null;
}

Deno.serve(async (req: Request): Promise<Response> => {
  const startTime = Date.now();

  if (req.method === "OPTIONS") {
    return preflightResponse(req);
  }

  if (req.method !== "POST") {
    return withCors(
      req,
      safeFailure(405, "method_not_allowed", "Only POST is allowed."),
    );
  }

  // Staging runtime gate
  const stagingError = enforceStagingRuntime();
  if (stagingError) return withCors(req, stagingError);

  // Resolve caller
  const callerOrError = createCallerContext(req);
  if (callerOrError instanceof Response) return withCors(req, callerOrError);

  const caller = callerOrError;

  // Resolve identity
  const userIdOrError = await resolveUserId(caller);
  if (userIdOrError instanceof Response) return withCors(req, userIdOrError);

  const userId = userIdOrError;

  // Parse body
  let body: JsonObject;
  try {
    const raw = await req.json();
    if (!isJsonObject(raw)) {
      return withCors(req, safeFailure(400, "invalid_json", "Request body must be a JSON object."));
    }
    body = raw;
  } catch {
    return withCors(req, safeFailure(400, "invalid_json", "Request body must be valid JSON."));
  }

  // Validate inputs
  let categoryId: string;
  let budgetYear: number;
  let budgetMonth: number;
  let limitAmount: number;

  try {
    categoryId = validateUuid("category_id", requireField(body, "category_id"));
    budgetYear = validateYear(requireField(body, "budget_year"));
    budgetMonth = validateMonth(requireField(body, "budget_month"));
    limitAmount = validateLimitAmount(requireField(body, "limit_amount"));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request parameters.";
    return withCors(req, safeFailure(400, "invalid_request", message));
  }

  // Verify category exists and belongs to user
  const categoryError = await resolveCategory(caller, userId, categoryId);
  if (categoryError) return withCors(req, categoryError);

  // Upsert budget
  const upsertError = await upsertBudget(caller, userId, categoryId, budgetYear, budgetMonth, limitAmount);
  if (upsertError) return withCors(req, upsertError);

  const elapsed = Date.now() - startTime;
  console.log(`[${FUNCTION_NAME}] set budget for user=${userId} category=${categoryId} ${budgetYear}-${budgetMonth}: ${limitAmount} (${elapsed}ms)`);

  return withCors(
    req,
    jsonResponse(200, {
      ok: true,
      data: {
        category_id: categoryId,
        budget_year: budgetYear,
        budget_month: budgetMonth,
        limit_amount: limitAmount,
      },
    }),
  );
});
