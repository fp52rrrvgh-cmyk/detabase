const FUNCTION_NAME = "classify-transaction";
const REQUIRED_ENVIRONMENT_LABEL = "staging";
const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};
const ALLOWED_CORS_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://web-two-gamma-aorcvaarnv.vercel.app",
]);
const DEFAULT_CORS_ORIGIN = "http://localhost:3000";
const CORS_METHODS = "POST, OPTIONS";
const CORS_HEADERS = "authorization, x-client-info, apikey, content-type";

type JsonObject = Record<string, unknown>;

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
  code: string,
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

type CallerContext = {
  accessToken: string;
  supabaseUrl: string;
  publishableKey: string;
};

function createCallerContext(req: Request): CallerContext | Response {
  const rawSupabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getPublishableKey();

  const authorization = req.headers.get("authorization")?.trim();
  if (!authorization) {
    return safeFailure(401, "missing_authorization", "Authorization bearer token is required.");
  }
  const [scheme, token, extra] = authorization.split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) {
    return safeFailure(401, "missing_authorization", "Authorization bearer token is required.");
  }

  if (!rawSupabaseUrl || !publishableKey) {
    return safeFailure(500, "runtime_not_configured", "The function runtime is not configured for safe staging access.");
  }

  return {
    accessToken: token,
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

/**
 * Match a description against enabled classification rules for the user.
 * Returns the best match: the enabled rule with the longest keyword that
 * appears anywhere in the description (case-insensitive).
 */
async function matchRules(
  caller: CallerContext,
  userId: string,
  description: string,
): Promise<Response> {
  // Fetch all enabled rules for this user
  const url = new URL(`${caller.supabaseUrl}/rest/v1/finance_classification_rules`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("is_enabled", "eq.true");
  url.searchParams.set("select", "id,keyword,category_id,account_id,movement_type");
  url.searchParams.set("limit", "1000");
  url.searchParams.set("order", "keyword.desc"); // longest keyword first via DB sort

  const response = await fetch(url.toString(), {
    headers: callerHeaders(caller),
  });

  if (!response.ok) {
    const body = await readJson(response);
    console.error(`[${FUNCTION_NAME}] fetch rules failed:`, JSON.stringify(body));
    return safeFailure(500, "rules_fetch_failed", "Could not fetch classification rules.");
  }

  const rules = await readJson(response);
  if (!Array.isArray(rules)) {
    return safeFailure(500, "invalid_rules", "Invalid rules data.");
  }

  const desc = description.toLowerCase().trim();
  if (!desc) {
    return jsonResponse(200, {
      ok: true,
      data: {
        match: null,
        possible: [],
      },
    });
  }

  // Sort by keyword length descending (most specific first)
  rules.sort((a: any, b: any) => b.keyword.length - a.keyword.length);

  type MatchResult = {
    ruleId: string;
    keyword: string;
    categoryId: string | null;
    accountId: string | null;
    movementType: string | null;
  };

  const bestMatch: MatchResult | null = null;
  const possibleMatches: MatchResult[] = [];

  for (const rule of rules) {
    const keyword = (rule.keyword as string).toLowerCase();
    if (desc.includes(keyword)) {
      const match = {
        ruleId: rule.id as string,
        keyword: rule.keyword as string,
        categoryId: rule.category_id as string | null,
        accountId: rule.account_id as string | null,
        movementType: rule.movement_type as string | null,
      };
      possibleMatches.push(match);
    }
  }

  // Pick the longest keyword match as the best
  const best =
    possibleMatches.length > 0
      ? possibleMatches.reduce((a, b) =>
          a.keyword.length >= b.keyword.length ? a : b
        )
      : null;

  return jsonResponse(200, {
    ok: true,
    data: {
      match: best,
      possible: possibleMatches,
    },
  });
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

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!description) {
    return withCors(req, safeFailure(400, "invalid_request", "description is required."));
  }

  const response = await matchRules(caller, userId, description);

  const elapsed = Date.now() - startTime;
  console.log(`[${FUNCTION_NAME}] user=${userId} desc="${description.slice(0, 50)}" (${elapsed}ms)`);

  return withCors(req, response);
});
