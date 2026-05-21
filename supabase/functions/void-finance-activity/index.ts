const FUNCTION_NAME = "void-finance-activity";
const REQUIRED_ENVIRONMENT_LABEL = "staging";
const CORRECTION_TYPE = "void";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};
const ALLOWED_CORS_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);
const DEFAULT_CORS_ORIGIN = "http://localhost:3000";
const CORS_METHODS = "POST, OPTIONS";
const CORS_HEADERS = "authorization, x-client-info, apikey, content-type";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_FIELDS = new Set(["activity_id", "reason"]);

type JsonObject = Record<string, unknown>;
type SafeFailureCode =
  | "invalid_request"
  | "invalid_activity_reference"
  | "invalid_reason"
  | "activity_not_found"
  | "activity_not_expense"
  | "activity_already_voided"
  | "void_not_allowed"
  | "void_insert_failed";

type CallerContext = {
  accessToken: string;
  supabaseUrl: string;
  publishableKey: string;
  privilegedKey: string;
};

type ValidatedInput = {
  activityId: string;
  reason: string;
};

type FinanceActivity = {
  id: string;
  user_id: string;
  movement_type: string;
};

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
    headers: corsHeaders(req),
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
        "Request contains unsupported fields.",
      );
    }
  }

  return null;
}

function validateActivityId(value: unknown): string {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw safeFailure(
      400,
      "invalid_activity_reference",
      "A valid activity reference is required.",
    );
  }

  return value.toLowerCase();
}

function validateReason(value: unknown): string {
  if (typeof value !== "string") {
    throw safeFailure(
      400,
      "invalid_reason",
      "A non-empty void reason is required.",
    );
  }

  const reason = value.trim();
  if (reason === "" || reason.includes("\u0000")) {
    throw safeFailure(
      400,
      "invalid_reason",
      "A non-empty void reason is required.",
    );
  }

  return reason;
}

function validateInput(body: JsonObject): ValidatedInput {
  const unsupported = rejectUnsupportedFields(body);
  if (unsupported) {
    throw unsupported;
  }

  return {
    activityId: validateActivityId(body.activity_id),
    reason: validateReason(body.reason),
  };
}

function normalizeSupabaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
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

function getPrivilegedKey(): string | null {
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY") ??
    null;
}

function enforceStagingRuntime(): Response | null {
  const environmentLabel = Deno.env.get("DETABASE_ENVIRONMENT");

  if (environmentLabel !== REQUIRED_ENVIRONMENT_LABEL) {
    return safeFailure(
      403,
      "void_not_allowed",
      "Void correction is enabled only for the staging runtime.",
    );
  }

  return null;
}

function extractBearerToken(req: Request): string | Response {
  const authorization = req.headers.get("authorization")?.trim();

  if (!authorization) {
    return safeFailure(
      401,
      "void_not_allowed",
      "Authenticated request is required.",
    );
  }

  const [scheme, token, extra] = authorization.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    return safeFailure(
      401,
      "void_not_allowed",
      "Authenticated request is required.",
    );
  }

  return token;
}

function createCallerContext(req: Request): CallerContext | Response {
  const rawSupabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getPublishableKey();
  const privilegedKey = getPrivilegedKey();
  const accessToken = extractBearerToken(req);

  if (accessToken instanceof Response) {
    return accessToken;
  }

  if (!rawSupabaseUrl || !publishableKey || !privilegedKey) {
    return safeFailure(
      500,
      "void_not_allowed",
      "Void correction runtime is not configured.",
    );
  }

  return {
    accessToken,
    supabaseUrl: normalizeSupabaseUrl(rawSupabaseUrl),
    publishableKey,
    privilegedKey,
  };
}

function callerHeaders(caller: CallerContext): Record<string, string> {
  return {
    apikey: caller.publishableKey,
    Authorization: `Bearer ${caller.accessToken}`,
  };
}

function privilegedHeaders(caller: CallerContext): Record<string, string> {
  return {
    apikey: caller.privilegedKey,
    Authorization: `Bearer ${caller.privilegedKey}`,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function restUrl(caller: CallerContext, table: string, select: string): URL {
  const url = new URL(`${caller.supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set("select", select);
  return url;
}

async function resolveUserId(
  caller: CallerContext,
): Promise<string | Response> {
  const response = await fetch(`${caller.supabaseUrl}/auth/v1/user`, {
    headers: callerHeaders(caller),
  });
  const data = await readJson(response);

  if (!response.ok || !isJsonObject(data) || typeof data.id !== "string") {
    return safeFailure(
      401,
      "void_not_allowed",
      "Caller identity could not be resolved.",
    );
  }

  return data.id;
}

async function findOwnedActivity(
  caller: CallerContext,
  userId: string,
  activityId: string,
): Promise<FinanceActivity | Response> {
  const url = restUrl(
    caller,
    "finance_activities",
    "id,user_id,movement_type",
  );
  url.searchParams.set("id", `eq.${activityId}`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: privilegedHeaders(caller),
  });
  const data = await readJson(response);

  if (!response.ok || !Array.isArray(data)) {
    return safeFailure(
      403,
      "void_not_allowed",
      "Activity reference could not be checked safely.",
    );
  }

  if (data.length === 0) {
    return safeFailure(
      404,
      "activity_not_found",
      "Activity was not found for this caller.",
    );
  }

  const activity = data[0];
  if (
    !isJsonObject(activity) ||
    typeof activity.id !== "string" ||
    typeof activity.user_id !== "string" ||
    typeof activity.movement_type !== "string"
  ) {
    return safeFailure(
      403,
      "void_not_allowed",
      "Activity reference could not be checked safely.",
    );
  }

  return activity as FinanceActivity;
}

async function hasExistingVoidCorrection(
  caller: CallerContext,
  userId: string,
  activityId: string,
): Promise<boolean | Response> {
  const url = restUrl(
    caller,
    "finance_activity_corrections",
    "correction_type",
  );
  url.searchParams.set("owner_user_id", `eq.${userId}`);
  url.searchParams.set("activity_id", `eq.${activityId}`);
  url.searchParams.set("correction_type", `eq.${CORRECTION_TYPE}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: privilegedHeaders(caller),
  });
  const data = await readJson(response);

  if (!response.ok || !Array.isArray(data)) {
    return safeFailure(
      403,
      "void_not_allowed",
      "Void correction state could not be checked safely.",
    );
  }

  return data.length > 0;
}

async function insertVoidCorrection(
  caller: CallerContext,
  userId: string,
  activityId: string,
  reason: string,
): Promise<Response | null> {
  const url = restUrl(
    caller,
    "finance_activity_corrections",
    "correction_type",
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      ...privilegedHeaders(caller),
      "content-type": "application/json",
      prefer: "return=representation",
    },
    body: JSON.stringify({
      activity_id: activityId,
      owner_user_id: userId,
      correction_type: CORRECTION_TYPE,
      reason,
      created_by: userId,
    }),
  });
  const data = await readJson(response);

  if (!response.ok) {
    if (response.status === 409 || isDuplicateError(data)) {
      return safeFailure(
        409,
        "activity_already_voided",
        "Activity already has a void correction.",
      );
    }

    return safeFailure(
      500,
      "void_insert_failed",
      "Void correction could not be saved safely.",
    );
  }

  if (!Array.isArray(data) || data.length !== 1) {
    return safeFailure(
      500,
      "void_insert_failed",
      "Void correction could not be saved safely.",
    );
  }

  return null;
}

function isDuplicateError(data: unknown): boolean {
  return isJsonObject(data) && data.code === "23505";
}

async function handlePost(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        ok: false,
        error: {
          code: "invalid_request",
          message: "Only POST requests are supported.",
        },
      }),
      {
        status: 405,
        headers: {
          ...JSON_HEADERS,
          allow: CORS_METHODS,
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return safeFailure(
      400,
      "invalid_request",
      "Request body must be valid JSON.",
    );
  }

  if (!isJsonObject(body)) {
    return safeFailure(
      400,
      "invalid_request",
      "Request body must be a JSON object.",
    );
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
      "Request validation failed.",
    );
  }

  const stagingRuntimeFailure = enforceStagingRuntime();
  if (stagingRuntimeFailure) {
    return stagingRuntimeFailure;
  }

  const caller = createCallerContext(req);
  if (caller instanceof Response) {
    return caller;
  }

  const userId = await resolveUserId(caller);
  if (userId instanceof Response) {
    return userId;
  }

  const activity = await findOwnedActivity(caller, userId, input.activityId);
  if (activity instanceof Response) {
    return activity;
  }

  if (activity.movement_type !== "expense") {
    return safeFailure(
      422,
      "activity_not_expense",
      "Only expense activities can be voided.",
    );
  }

  const alreadyVoided = await hasExistingVoidCorrection(
    caller,
    userId,
    input.activityId,
  );
  if (alreadyVoided instanceof Response) {
    return alreadyVoided;
  }

  if (alreadyVoided) {
    return safeFailure(
      409,
      "activity_already_voided",
      "Activity already has a void correction.",
    );
  }

  const insertFailure = await insertVoidCorrection(
    caller,
    userId,
    input.activityId,
    input.reason,
  );
  if (insertFailure) {
    return insertFailure;
  }

  return jsonResponse(201, {
    ok: true,
    correction: {
      type: CORRECTION_TYPE,
      status: "created",
    },
    activity: {
      status: "voided",
    },
    validation: {
      source: FUNCTION_NAME,
      original_activity_preserved: true,
    },
  });
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return preflightResponse(req);
  }

  try {
    return withCors(req, await handlePost(req));
  } catch {
    console.error(`${FUNCTION_NAME}: internal_error`);
    return withCors(
      req,
      safeFailure(
        500,
        "void_not_allowed",
        "Void correction could not be processed safely.",
      ),
    );
  }
}

if (import.meta.main) {
  Deno.serve(handler);
}
