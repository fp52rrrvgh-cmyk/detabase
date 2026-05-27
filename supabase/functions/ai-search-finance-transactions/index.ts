const FUNCTION_NAME = "ai-search-finance-transactions";
const HMAC_HEADER = "x-hermes-secret";
const DEFAULT_LIMIT = 20;

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function ok(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_HEADERS });
}
function fail(status: number, msg: string, code?: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code: code ?? "ERROR", message: msg } }), { status, headers: JSON_HEADERS });
}

function validateDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204 });
    if (req.method !== "POST") return fail(405, "Only POST");

    const secret = req.headers.get(HMAC_HEADER);
    const srKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!srKey || (secret !== srKey && secret !== anonKey)) return fail(403, "Forbidden");

    let body: unknown;
    try { body = await req.json(); } catch { return fail(400, "Invalid JSON"); }
    const b = body as Record<string, unknown>;
    const userId = b.user_id;
    if (typeof userId !== "string" || !userId) return fail(400, "user_id required");

    const filters: string[] = [`user_id=eq.${encodeURIComponent(userId)}`];

    if (typeof b.date_from === "string" && validateDate(b.date_from as string)) {
      filters.push(`activity_date=gte.${b.date_from}`);
    }
    if (typeof b.date_to === "string" && validateDate(b.date_to as string)) {
      filters.push(`activity_date=lte.${b.date_to}`);
    }
    if (b.movement_type === "income" || b.movement_type === "expense") {
      filters.push(`movement_type=eq.${b.movement_type}`);
    }
    if (typeof b.keyword === "string" && (b.keyword as string).trim().length > 0) {
      const kw = (b.keyword as string).trim().replace(/[%_]/g, "\\$&").replace(/'/g, "''");
      filters.push(`description=ilike.*${encodeURIComponent(kw)}*`);
    }
    if (typeof b.category_id === "string" && (b.category_id as string).length > 0) {
      filters.push(`category_id=eq.${encodeURIComponent(b.category_id)}`);
    }
    if (typeof b.account_id === "string" && (b.account_id as string).length > 0) {
      filters.push(`account_id=eq.${encodeURIComponent(b.account_id)}`);
    }
    const minAmt = typeof b.amount_min === "number" ? b.amount_min : NaN;
    const maxAmt = typeof b.amount_max === "number" ? b.amount_max : NaN;
    if (Number.isFinite(minAmt)) filters.push(`amount=gte.${minAmt}`);
    if (Number.isFinite(maxAmt)) filters.push(`amount=lte.${maxAmt}`);

    const limit = typeof b.limit === "number" && b.limit > 0 && b.limit <= 100 ? b.limit : DEFAULT_LIMIT;
    const offset = typeof b.offset === "number" && b.offset >= 0 ? b.offset : 0;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl || !srKey) return fail(500, "Server not configured");

    const base = supabaseUrl.replace(/\/+$/, "");
    const select = "id,activity_date,amount,currency,movement_type,description,category_id,account_id,created_at";
    const order = "activity_date.desc,created_at.desc";
    const url = `${base}/rest/v1/finance_activities?select=${select}&${filters.join("&")}&order=${order}&limit=${limit}&offset=${offset}`;

    const resp = await fetch(url, {
      headers: { "apikey": srKey, "Authorization": `Bearer ${srKey}` },
    });

    if (!resp.ok) {
      const text = await resp.text();
      return fail(500, `Query failed (${resp.status}): ${text}`);
    }

    const data = await resp.json();
    const txns = Array.isArray(data) ? data : [];
    return ok({ ok: true, transactions: txns, count: txns.length });
  } catch (e) {
    return fail(500, `Error: ${String(e)}`);
  }
});
