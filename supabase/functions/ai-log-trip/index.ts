// ai-log-trip — 車趟記錄 Edge Function
// HMAC auth via x-hermes-secret (uses SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)
// Supports: POST / (log trip), GET /?keyword=x&month=YYYY-MM

const HMAC_HEADER = "x-hermes-secret";
const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function ok(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status: 201, headers: JSON_HEADERS });
}

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function fail(status: number, msg: string, code?: string): Response {
  return json(status, { ok: false, error: { code: code ?? "ERROR", message: msg } });
}

// ── Auth ─────────────────────────────────────
function checkAuth(req: Request): boolean {
  const secret = req.headers.get(HMAC_HEADER);
  if (!secret) return false;
  const srKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  // Also accept SUPABASE_ACCESS_TOKEN
  const accessToken = Deno.env.get("SUPABASE_ACCESS_TOKEN");
  return (!!srKey && secret === srKey) 
      || (!!anonKey && secret === anonKey)
      || (!!accessToken && secret === accessToken);
}

// ── 日期推斷 ──────────────────────────────────
function resolveDate(text: string, now: Date): string | null {
  const m1 = text.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m1) return null;
  let month = parseInt(m1[1]), day = parseInt(m1[2]);
  let year = now.getFullYear();
  if (now.getMonth() === 0 && month === 12) year--;
  if (now.getMonth() === 11 && month === 1) year++;
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

// ── 文字拆解 ──────────────────────────────────
interface TripData {
  date: string;
  client: string;
  origin: string;
  dest: string;
  note: string;
  fuel: number;
}

function parseTripText(text: string, now: Date): TripData | null {
  const lines = text.split(/\n|\\n/).map(l => l.trim()).filter(Boolean);
  const fields: Record<string, string> = {};
  for (const line of lines) {
    const m = line.match(/^(日期|客戶|起點|抵達|備注|備註)[：:](.+)/);
    if (m) {
      const key = m[1] === "備注" ? "備註" : m[1];
      fields[key] = m[2].trim();
    }
  }
  const dateStr = fields["日期"];
  if (!dateStr) return null;
  const date = resolveDate(dateStr, now);
  if (!date) return null;
  return {
    date,
    client: fields["客戶"] ?? "",
    origin: fields["起點"] ?? "",
    dest: fields["抵達"] ?? "",
    note: fields["備註"] ?? "",
    fuel: 0,
  };
}

// ── 取得 user_id ──────────────────────────────
async function getUserId(baseHeaders: Record<string, string>): Promise<string | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const resp = await fetch(`${supabaseUrl}/rest/v1/finance_categories?select=user_id&limit=1`, { headers: baseHeaders });
  const users = await resp.json();
  return users?.[0]?.user_id ?? null;
}

// ── Handler ────────────────────────────────────
async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (!checkAuth(req)) return fail(403, "Forbidden");

  const srKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const apikey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const baseHeaders = { apikey, authorization: `Bearer ${srKey}`, "content-type": "application/json" };

  // ── GET: query trips ──
  if (req.method === "GET") {
    const url = new URL(req.url);
    const month = url.searchParams.get("month") ?? "";
    const keyword = url.searchParams.get("keyword") ?? "";

    let query = `${supabaseUrl}/rest/v1/trips?select=*`;
    if (month) query += `&date=like.${month}*`;
    else if (keyword) {
      const encoded = encodeURIComponent(keyword);
      query += `&or=(client.ilike.*${encoded}*,origin.ilike.*${encoded}*,dest.ilike.*${encoded}*)`;
    }
    query += "&order=date.desc&limit=50";

    const resp = await fetch(query, { headers: baseHeaders });
    const data = await resp.json();
    return json(200, { ok: true, data });
  }

  if (req.method !== "POST") return fail(405, "Only POST/GET");

  const body = await req.json().catch(() => null);
  if (!body) return fail(400, "Invalid JSON");

  const { text, action } = body;
  const now = new Date();

  // ── add trip ──
  if (action === "add" || (!action && text)) {
    let trip: TripData | null = null;
    if (body.date && body.client) {
      trip = { date: body.date, client: body.client, origin: body.origin ?? "", dest: body.dest ?? "", note: body.note ?? "", fuel: body.fuel ?? 0 };
    } else if (text) {
      trip = parseTripText(text, now);
    }
    if (!trip) return fail(400, "無法解析車趟文字", "PARSE_ERROR");

    const userId = await getUserId(baseHeaders);
    if (!userId) return fail(400, "找不到使用者", "NO_USER");

    const insert = await fetch(`${supabaseUrl}/rest/v1/trips`, {
      method: "POST",
      headers: { ...baseHeaders, prefer: "return=representation" },
      body: JSON.stringify({ user_id: userId, ...trip }),
    });
    const inserted = await insert.json();
    return ok({ ok: true, data: inserted });
  }

  // ── fuel ──
  if (action === "fuel") {
    const { date, amount, seq } = body;
    if (!date || !amount) return fail(400, "缺少 date 或 amount");
    const tripResp = await fetch(
      `${supabaseUrl}/rest/v1/trips?select=id&date=eq.${date}&order=id.asc`,
      { headers: baseHeaders }
    );
    const trips = await tripResp.json();
    const idx = seq ? seq - 1 : (trips.length - 1);
    if (idx < 0 || idx >= trips.length) return fail(404, "找不到對應車趟");
    const tripId = trips[idx].id;
    await fetch(`${supabaseUrl}/rest/v1/trips?id=eq.${tripId}`, {
      method: "PATCH",
      headers: { ...baseHeaders, prefer: "return=representation" },
      body: JSON.stringify({ fuel: amount }),
    });
    return ok({ ok: true, data: { id: tripId, fuel: amount } });
  }

  // ── freight ──
  if (action === "freight") {
    const { date, amount } = body;
    if (!date || !amount) return fail(400, "缺少 date 或 amount");
    const userId = await getUserId(baseHeaders);
    if (!userId) return fail(400, "找不到使用者");
    const insert = await fetch(`${supabaseUrl}/rest/v1/freight`, {
      method: "POST",
      headers: { ...baseHeaders, prefer: "return=representation" },
      body: JSON.stringify({ user_id: userId, date, amount }),
    });
    const inserted = await insert.json();
    return ok({ ok: true, data: inserted });
  }

  return fail(400, "未知 action");
}

Deno.serve(handler);
