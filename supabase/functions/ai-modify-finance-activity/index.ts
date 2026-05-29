const FUNCTION_NAME = "ai-modify-finance-activity";
const DEFAULT_CURRENCY = "TWD";
const HMAC_HEADER = "x-hermes-secret";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

type JsonObject = Record<string, unknown>;

function jsonResponse(status: number, body: JsonObject): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function ok(body: JsonObject): Response {
  return jsonResponse(200, body);
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
  const action = b.action;
  if (action !== "modify" && action !== "void") return fail(400, "action must be 'modify' or 'void'");

  const activityId = b.activity_id;
  if (typeof activityId !== "string" || !activityId) return fail(400, "activity_id required");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl || !srKey) return fail(500, "Server not configured");
  const base = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1`;

  const headers = {
    "apikey": srKey,
    "Authorization": `Bearer ${srKey}`,
    "content-type": "application/json",
  };

  if (action === "void") {
    // Void: insert correction record + update activity description
    const reason = typeof b.reason === "string" ? (b.reason as string).trim() : "AI 作廢";

    // First get the activity to find user_id
    const getResp = await fetch(`${base}/finance_activities?select=user_id,description&id=eq.${activityId}&limit=1`, { headers });
    if (!getResp.ok) return fail(404, "Activity not found");
    const actRows = await getResp.json();
    const activity = Array.isArray(actRows) ? actRows[0] : actRows;
    if (!activity?.user_id) return fail(404, "Activity not found");

    // Insert correction record
    const corrResp = await fetch(`${base}/finance_activity_corrections`, {
      method: "POST",
      headers: { ...headers, "prefer": "return=representation" },
      body: JSON.stringify({
        user_id: activity.user_id,
        activity_id: activityId,
        correction_type: "void",
        reason: reason,
      }),
    });
    if (!corrResp.ok) {
      const err = await corrResp.text().catch(() => "unknown");
      return fail(500, `Void correction insert failed: ${err}`);
    }

    return ok({ ok: true, action: "voided", activity_id: activityId });
  }

  // action === "modify"
  const updates: Record<string, unknown> = {};
  const fields = ["amount", "description", "activity_date", "movement_type", "category_id", "account_id"] as const;
  let hasUpdates = false;
  for (const f of fields) {
    if (b[f] !== undefined) {
      if (f === "amount") {
        const amt = typeof b[f] === "number" ? b[f] as number : Number(b[f]);
        if (!Number.isFinite(amt) || amt <= 0) return fail(400, "amount must be > 0");
        updates[f] = amt;
      } else if (f === "activity_date") {
        if (typeof b[f] !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(b[f] as string)) {
          return fail(400, "activity_date must be YYYY-MM-DD");
        }
        updates[f] = b[f];
      } else if (f === "movement_type") {
        if (b[f] !== "income" && b[f] !== "expense") return fail(400, "movement_type must be income/expense");
        updates[f] = b[f];
      } else {
        updates[f] = b[f];
      }
      hasUpdates = true;
    }
  }

  if (!hasUpdates) return fail(400, "No fields to update");

  const resp = await fetch(`${base}/finance_activities?id=eq.${activityId}`, {
    method: "PATCH",
    headers: { ...headers, "prefer": "return=representation" },
    body: JSON.stringify(updates),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => "unknown");
    return fail(500, `Update failed: ${err}`);
  }

  const result = await resp.json();
  return ok({ ok: true, action: "modified", activity_id: activityId, updated: result });
}

Deno.serve(handler);
