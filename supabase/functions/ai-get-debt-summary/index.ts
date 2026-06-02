import "jsr:@std/dotenv/load";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

// ─── Config ───────────────────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const HERMES_SECRET = Deno.env.get("HERMES_REF_SECRET") || "";
const SECRET_OK = HERMES_SECRET.length >= 16;

// ─── Auth ──────────────────────────────────────────────────────────────────
function verifyAuth(req: Request): { userId: string } | null {
  const authHeader = req.headers.get("x-hermes-secret") || "";
  const timestamp = req.headers.get("x-hermes-ts") || "";
  const userId = req.headers.get("x-hermes-user-id") || "";

  if (!authHeader || !timestamp || !userId) return null;

  // Verify HMAC: HMAC-SHA256(key=secret, message=timestamp + "." + userId)
  // Canonical message format: "${timestamp}.${userId}"
  const expected = createHmac("sha256", HERMES_SECRET)
    .update(timestamp + userId)
    .digest("hex");

  // Constant-time comparison
  if (authHeader.length !== expected.length) return null;
  let match = 0;
  for (let i = 0; i < authHeader.length; i++) {
    match |= authHeader.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (match !== 0) return null;

  // Timestamp freshness: within 5 minutes
  const now = Date.now();
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(now - ts) > 300_000) return null;

  // Validate userId is UUID format
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return null;

  return { userId };
}

// ─── Handler ───────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const headers = {
    "Content-Type": "application/json",
    "Connection": "keep-alive",
  };

  // Verify auth
  if (!SECRET_OK) {
    return new Response(JSON.stringify({ ok: false, error: "server not configured" }), {
      status: 500, headers,
    });
  }
  const auth = verifyAuth(req);
  if (!auth) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers,
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Query debts — user_id is hardcoded from HMAC, not from request body
    const { data: debts, error } = await supabase
      .from("finance_debts")
      .select("id, creditor, remaining, min_payment, next_due_date, status, debt_type")
      .eq("user_id", auth.userId)
      .order("next_due_date", { ascending: true, nullsFirst: false });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers,
      });
    }

    // Compute summary
    const today = new Date().toISOString().slice(0, 10);
    const active = (debts || []).filter((d) => d.status === "active" && (d.remaining || 0) > 0);
    const totalRemaining = active.reduce((s, d) => s + Number(d.remaining), 0);
    const totalMinPayment = active.reduce((s, d) => s + Number(d.min_payment || 0), 0);
    const overdue = active.filter((d) => d.next_due_date && d.next_due_date < today);
    const dueSoon = active.filter(
      (d) => d.next_due_date && d.next_due_date >= today && d.next_due_date <= addDays(today, 7)
    );

    // Find next due date
    const sorted = [...active].filter((d) => d.next_due_date).sort(
      (a, b) => (a.next_due_date || "").localeCompare(b.next_due_date || "")
    );
    const nextDueDate = sorted.length > 0 ? sorted[0].next_due_date : null;

    return new Response(
      JSON.stringify({
        ok: true,
        as_of_date: today,
        currency: "TWD",
        total_remaining: totalRemaining,
        total_min_payment: totalMinPayment,
        next_due_date: nextDueDate,
        overdue_count: overdue.length,
        due_soon_count: dueSoon.length,
        debt_count: active.length,
        debts: active.map((d) => ({
          id: d.id,
          creditor: d.creditor,
          remaining: d.remaining,
          min_payment: d.min_payment,
          next_due_date: d.next_due_date,
          status: d.status,
          debt_type: d.debt_type,
          is_overdue: d.next_due_date ? d.next_due_date < today : false,
          days_until_due: d.next_due_date
            ? Math.ceil(
                (new Date(d.next_due_date).getTime() - new Date(today).getTime()) / 86400000
              )
            : null,
        })),
      }),
      { status: 200, headers }
    );
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers,
    });
  }
});

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
