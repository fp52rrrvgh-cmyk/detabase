const FUNCTION_NAME = "ai-log-finance-activity";
const DEFAULT_CURRENCY = "TWD";
const HMAC_HEADER = "x-hermes-secret";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

type JsonObject = Record<string, unknown>;

function jsonResponse(status: number, body: JsonObject): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function ok(body: JsonObject): Response {
  return jsonResponse(201, body);
}

function fail(status: number, msg: string, code?: string): Response {
  return jsonResponse(status, { ok: false, error: { code: code ?? "ERROR", message: msg } });
}

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (req.method !== "POST") return fail(405, "Only POST");

  // Verify using SR_KEY as shared secret
  const secret = req.headers.get(HMAC_HEADER);
  const srKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!srKey || (secret !== srKey && secret !== anonKey)) return fail(403, "Forbidden");

  let body: unknown;
  try { body = await req.json(); }
  catch { return fail(400, "Invalid JSON"); }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail(400, "Body must be object");
  }

  const b = body as Record<string, unknown>;

  const userId = b.user_id;
  if (typeof userId !== "string" || !userId) return fail(400, "user_id required");

  const mt = b.movement_type;
  if (mt !== "income" && mt !== "expense") return fail(400, "movement_type must be income/expense");

  const rawAmt = b.amount;
  const amt = typeof rawAmt === "number" ? rawAmt : Number(rawAmt);
  if (!Number.isFinite(amt) || amt <= 0) return fail(400, "amount must be > 0");

  const date = typeof b.activity_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.activity_date as string)
    ? b.activity_date as string
    : new Date().toISOString().slice(0, 10);

  const desc = typeof b.description === "string" ? (b.description as string).trim() || null : null;

  const payload: Record<string, unknown> = {
    user_id: userId,
    activity_date: date,
    movement_type: mt,
    amount: amt,
    currency: DEFAULT_CURRENCY,
    source_indicator: "manual",
    description: desc,
  };

  if (typeof b.account_id === "string" && (b.account_id as string).length > 0) {
    payload.account_id = b.account_id;
  }
  if (typeof b.category_id === "string" && (b.category_id as string).length > 0) {
    payload.category_id = b.category_id;
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl || !srKey) return fail(500, "Server not configured");

  const url = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/finance_activities`;
  const resp = await fetch(`${url}?select=id,activity_date,amount,movement_type`, {
    method: "POST",
    headers: {
      "apikey": srKey,
      "Authorization": `Bearer ${srKey}`,
      "content-type": "application/json",
      "prefer": "return=representation",
    },
    body: JSON.stringify(payload),
  });

  const result = await resp.json();
  if (!resp.ok) {
    console.error(`${FUNCTION_NAME}: insert fail`, JSON.stringify(result));
    return fail(500, `Insert failed: ${JSON.stringify(result)}`);
  }

  return ok({ ok: true, activity: Array.isArray(result) ? result[0] : result });
}

Deno.serve(handler);
