const FUNCTION_NAME = "ai-finance-daily-digest";
const HMAC_HEADER = "x-hermes-secret";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function ok(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_HEADERS });
}
function fail(status: number, msg: string, code?: string): Response {
  return new Response(JSON.stringify({ ok: false, error: { code: code ?? "ERROR", message: msg } }), { status, headers: JSON_HEADERS });
}

function pad2(n: number): string { return String(n).padStart(2, "0"); }

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") return new Response(null, { status: 204 });
    if (req.method !== "POST") return fail(405, "Only POST");

    const secret = req.headers.get(HMAC_HEADER);
    const srKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!srKey || (secret !== srKey && secret !== anonKey)) return fail(403, "Forbidden");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (!supabaseUrl) return fail(500, "Server not configured");
    const base = `${supabaseUrl.replace(/\/+$/, "")}/rest/v1`;
    const h = { "apikey": srKey, "Authorization": `Bearer ${srKey}` };

    const now = new Date();
    const today = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const monthStart = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`;
    const monthEnd = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;
    const thirtyDaysLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30).toISOString().slice(0, 10);

    // Get user
    const userResp = await fetch(`${base}/auth/users?limit=1`, { headers: h });
    // Actually Supabase REST can't list auth users. We'll query activities to find the user.
    const userFromActivities = await fetch(`${base}/finance_activities?select=user_id&limit=1&order=created_at.desc`, { headers: h });
    const userRows = await userFromActivities.json();
    const userId = Array.isArray(userRows) && userRows.length > 0 ? userRows[0].user_id : null;
    if (!userId) return ok({ ok: true, digest: "尚無用戶資料" });

    // Parallel queries
    const [actResp, budgetResp, subResp] = await Promise.all([
      fetch(`${base}/finance_activities?select=amount,movement_type,category_id,activity_date&user_id=eq.${userId}&activity_date=gte.${monthStart}&activity_date=lte.${monthEnd}&limit=1000`, { headers: h }),
      fetch(`${base}/finance_budgets?select=category_id,limit_amount&user_id=eq.${userId}&budget_year=eq.${now.getFullYear()}&budget_month=eq.${now.getMonth() + 1}&limit=100`, { headers: h }),
      fetch(`${base}/finance_subscriptions?select=description,amount,movement_type,next_date&is_active=eq.true&user_id=eq.${userId}&next_date=gte.${today}&next_date=lte.${thirtyDaysLater}&limit=20`, { headers: h }),
    ]);

    const activities = await actResp.json();
    const budgets = await budgetResp.json();
    const subscriptions = await subResp.json();

    const acts = Array.isArray(activities) ? activities : [];
    const buds = Array.isArray(budgets) ? budgets : [];
    const subs = Array.isArray(subscriptions) ? subscriptions : [];

    // Calculate
    const totalExpense = acts.filter((a: any) => a.movement_type === "expense").reduce((s: number, a: any) => s + Number(a.amount), 0);
    const totalIncome = acts.filter((a: any) => a.movement_type === "income").reduce((s: number, a: any) => s + Number(a.amount), 0);
    const todayExpense = acts.filter((a: any) => a.movement_type === "expense" && a.activity_date === today).reduce((s: number, a: any) => s + Number(a.amount), 0);
    const totalBudget = buds.reduce((s: number, b: any) => s + Number(b.limit_amount), 0);

    // Build digest
    const lines: string[] = [];
    const dayOfMonth = now.getDate();
    const daysLeft = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - dayOfMonth;

    if (todayExpense > 0) lines.push(`📅 今日已支出 TWD ${Math.round(todayExpense).toLocaleString()}`);
    lines.push(`📆 ${now.getMonth() + 1}月累計：支出 TWD ${Math.round(totalExpense).toLocaleString()}｜收入 TWD ${Math.round(totalIncome).toLocaleString()}`);

    if (totalBudget > 0) {
      const pct = Math.round((totalExpense / totalBudget) * 100);
      const remain = totalBudget - totalExpense;
      lines.push(`🎯 預算已用 ${pct}%，剩 TWD ${Math.round(remain).toLocaleString()}（剩 ${daysLeft} 天）`);
      if (remain < 0) lines.push(`⚠️ 已超支 TWD ${Math.round(Math.abs(remain)).toLocaleString()}！`);
      else if (pct > 80) lines.push(`⚡ 接近預算上限，請注意！`);
    }

    // Subscriptions due in next 7 days
    const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString().slice(0, 10);
    const dueSoon = subs.filter((s: any) => s.next_date <= nextWeek);
    if (dueSoon.length > 0) {
      lines.push(`🔔 未來 7 天有 ${dueSoon.length} 筆訂閱即將扣款：`);
      for (const s of dueSoon) {
        lines.push(`  • ${s.description} TWD ${Number(s.amount).toLocaleString()}（${s.next_date}）`);
      }
    } else if (subs.length > 0) {
      lines.push(`✅ 未來 7 天無即將扣款訂閱`);
    }

    if (daysLeft <= 7) {
      const avgDaily = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;
      const projected = totalExpense + avgDaily * daysLeft;
      lines.push(`🔮 推估月底總支出 TWD ${Math.round(projected).toLocaleString()}`);
    }

    const digest = lines.join("\n");

    return ok({ ok: true, digest, metrics: { totalExpense: Math.round(totalExpense), totalIncome: Math.round(totalIncome), totalBudget: Math.round(totalBudget), todayExpense: Math.round(todayExpense) } });
  } catch (e) {
    console.error(`${FUNCTION_NAME}: error`, e);
    return fail(500, "Internal error");
  }
});
