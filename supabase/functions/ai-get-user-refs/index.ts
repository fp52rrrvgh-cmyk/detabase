// Helper: fetch user's categories and accounts
// Uses SUPABASE_SERVICE_ROLE_KEY as shared secret for auth
const HMAC_HEADER = "x-hermes-secret";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function ok(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_HEADERS });
}
function fail(status: number, msg: string, code?: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code: code ?? "ERROR", message: msg } }), { status, headers: JSON_HEADERS });
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204 });
    if (req.method !== "POST") return fail(405, "Only POST");

    // Verify using SR_KEY as shared secret
    const secret = req.headers.get(HMAC_HEADER);
    const srKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!srKey || secret !== srKey) {
      // Also accept ANON key as fallback
      if (!anonKey || secret !== anonKey) {
        return fail(403, "Forbidden");
      }
    }

    let body: unknown;
    try { body = await req.json(); } catch { return fail(400, "Invalid JSON"); }
    const b = body as Record<string, unknown>;
    const userId = b.user_id;
    if (typeof userId !== "string" || !userId) return fail(400, "user_id required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) return fail(500, "Server not configured");

    const base = supabaseUrl.replace(/\/+$/, "");

    const [catResp, acctResp] = await Promise.all([
      fetch(`${base}/rest/v1/finance_categories?select=id,display_name,grouping_purpose&user_id=eq.${encodeURIComponent(userId)}&order=display_name`, {
        headers: { "apikey": srKey, "Authorization": `Bearer ${srKey}` },
      }),
      fetch(`${base}/rest/v1/finance_accounts?select=id,display_name,account_type,is_coin_box&user_id=eq.${encodeURIComponent(userId)}&order=display_name`, {
        headers: { "apikey": srKey, "Authorization": `Bearer ${srKey}` },
      }),
    ]);

    const catBody = catResp.ok ? await catResp.text() : `FAIL(${catResp.status}): ${await catResp.text()}`;
    const acctBody = acctResp.ok ? await acctResp.text() : `FAIL(${acctResp.status}): ${await acctResp.text()}`;

    let categories: unknown[] = [];
    let accounts: unknown[] = [];
    try { categories = JSON.parse(catBody); } catch {}
    try { accounts = JSON.parse(acctBody); } catch {}

    return ok({
      ok: true,
      catStatus: catResp.status,
      acctStatus: acctResp.status,
      categories: Array.isArray(categories) ? categories : [],
      accounts: Array.isArray(accounts) ? accounts : [],
    });
  } catch (e) {
    return fail(500, `Error: ${String(e)}`);
  }
});
