const FUNCTION_NAME = "ai-process-subscriptions";
const HMAC_HEADER = "x-hermes-secret";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function ok(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_HEADERS });
}

function fail(status: number, msg: string, code?: string): Response {
  return new Response(
    JSON.stringify({ ok: false, error: { code: code ?? "ERROR", message: msg } }),
    { status, headers: JSON_HEADERS },
  );
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") return fail(405, "Only POST");

    const secret = req.headers.get(HMAC_HEADER);
    const srKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!srKey || (secret !== srKey && secret !== anonKey)) return fail(403, "Forbidden");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) return fail(500, "Server not configured");

    const base = supabaseUrl.replace(/\/+$/, "");
    const today = new Date().toISOString().slice(0, 10);

    // Step 1: Query subscriptions where next_date <= today AND is_active = true
    const queryUrl = base + "/rest/v1/finance_subscriptions?select=id,user_id,movement_type,amount,category_id,account_id,description,frequency,next_date&is_active=eq.true&next_date=lte." + today + "&order=next_date.asc";

    const queryResp = await fetch(queryUrl, {
      headers: { "apikey": srKey, "Authorization": "Bearer " + srKey },
    });

    if (!queryResp.ok) {
      const text = await queryResp.text();
      return fail(500, "Query failed: " + text);
    }

    const subs = await queryResp.json() as Array<{
      id: string; user_id: string; movement_type: string; amount: number;
      category_id: string; account_id: string; description: string;
      frequency: string; next_date: string;
    }>;

    const results: Array<{ subId: string; status: string; activityId?: string; nextDate?: string }> = [];

    for (const sub of subs) {
      // Step 2: Insert finance_activity
      const activityBody = {
        user_id: sub.user_id,
        activity_date: today,
        amount: Number(sub.amount),
        currency: "TWD",
        movement_type: sub.movement_type,
        account_id: sub.account_id,
        category_id: sub.category_id,
        description: "[訂閱] " + sub.description,
        source_indicator: "manual",
      };

      const insertResp = await fetch(base + "/rest/v1/finance_activities", {
        method: "POST",
        headers: {
          "apikey": srKey,
          "Authorization": "Bearer " + srKey,
          "content-type": "application/json",
          "prefer": "return=representation",
        },
        body: JSON.stringify(activityBody),
      });

      if (!insertResp.ok) {
        const text = await insertResp.text();
        results.push({ subId: sub.id, status: "insert_failed: " + text });
        continue;
      }

      const inserted = await insertResp.json();
      const activityId = Array.isArray(inserted) ? inserted[0]?.id : inserted?.id;

      // Step 3: Calculate next_date based on frequency
      const nextDate = new Date(sub.next_date);
      switch (sub.frequency) {
        case "weekly": nextDate.setDate(nextDate.getDate() + 7); break;
        case "monthly": nextDate.setMonth(nextDate.getMonth() + 1); break;
        case "yearly": nextDate.setFullYear(nextDate.getFullYear() + 1); break;
      }
      const nextDateStr = nextDate.toISOString().slice(0, 10);

      // Step 4: Update subscription's next_date and last_generated_date
      const updateResp = await fetch(base + "/rest/v1/finance_subscriptions?id=eq." + sub.id, {
        method: "PATCH",
        headers: {
          "apikey": srKey,
          "Authorization": "Bearer " + srKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          next_date: nextDateStr,
          last_generated_date: today,
        }),
      });

      if (!updateResp.ok) {
        const text = await updateResp.text();
        results.push({ subId: sub.id, status: "activity_created_but_update_failed: " + text, activityId });
        continue;
      }

      results.push({ subId: sub.id, status: "ok", activityId, nextDate: nextDateStr });
    }

    return ok({ ok: true, processed: results.length, results });
  } catch (e) {
    return fail(500, String(e));
  }
});
