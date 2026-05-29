"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { runtimeConfig } from "../../constants";

/* ─── Types ─── */

type CategorySummary = {
  categoryLabel: string;
  total: number;
  count: number;
};

type AdvisorResult = {
  answer: string;
};

type AdvisorState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: string }
  | { status: "failure"; message: string };

/* ─── Helpers ─── */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthStart(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

function monthEnd(year: number, month: number): string {
  return `${year}-${pad2(month)}-${new Date(year, month, 0).getDate()}`;
}

function formatTWD(n: number): string {
  return `TWD ${Math.round(n).toLocaleString()}`;
}

/* ─── Keyword matching ─── */

type Intent =
  | { type: "total_expense" }
  | { type: "total_income" }
  | { type: "top_category" }
  | { type: "category_query"; keywords: string[] }
  | { type: "summary" };

function detectIntent(input: string): Intent {
  const s = input.trim();
  if (!s) return { type: "summary" };

  const totalPatterns = ["花了多少", "總共", "總支出", "總共花", "多少錢"];
  const incomePatterns = ["收入多少", "賺了多少", "總收入", "收入總共"];
  const topPatterns = ["最多", "最大", "最花錢", "花最多", "哪個分類"];

  // Category keywords
  const categoryKeywords: [string, string[]][] = [
    ["伙食", ["伙食", "吃", "餐", "飲食", "食物", "便當", "外食", "早餐", "午餐", "晚餐", "宵夜"]],
    ["交通", ["交通", "車資", "車票", "捷運", "公車", "高鐵", "台鐵", "客運", "通行"]],
    ["加油", ["加油", "汽油", "柴油", "油錢", "油費", "油資"]],
    ["購物", ["購物", "買", "網購", "商城", "超市", "賣場", "商店", "百貨"]],
    ["娛樂", ["娛樂", "玩", "遊戲", "電影", "音樂", "休閒", "旅遊", "旅行"]],
    ["水電", ["水電", "水費", "電費", "瓦斯", "瓦斯費", "手機費", "電信", "網路費"]],
    ["醫療", ["醫療", "看病", "醫生", "藥", "藥局", "診所", "醫院"]],
  ];

  for (const [category, kws] of categoryKeywords) {
    if (kws.some((kw) => s.includes(kw))) {
      return { type: "category_query", keywords: [category] };
    }
  }

  if (incomePatterns.some((p) => s.includes(p))) {
    return { type: "total_income" };
  }

  if (totalPatterns.some((p) => s.includes(p))) {
    return { type: "total_expense" };
  }

  if (topPatterns.some((p) => s.includes(p))) {
    return { type: "top_category" };
  }

  return { type: "summary" };
}

/* ─── Query logic ─── */

async function queryData(
  supabase: any,
  intent: Intent,
): Promise<AdvisorResult> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = monthStart(year, month);
  const end = monthEnd(year, month);

  // Fetch categories mapping
  const { data: catRows } = await supabase
    .from("finance_categories")
    .select("id,display_name")
    .limit(500);
  const catMap = new Map<string, string>(
    (catRows ?? []).map((c: any) => [c.id, c.display_name?.trim() || "未分類"]),
  );

  // Fetch activities for this month
  const { data: activities } = await supabase
    .from("finance_activities")
    .select("activity_date,movement_type,amount,category_id,description")
    .gte("activity_date", start)
    .lte("activity_date", end)
    .order("activity_date", { ascending: true })
    .limit(2000);

  const rows = (activities ?? []) as any[];

  // Determine which activities to analyze (expense for most queries)
  const expenses = rows.filter((r: any) => r.movement_type === "expense");
  const incomes = rows.filter((r: any) => r.movement_type === "income");

  const totalExpense = expenses.reduce((s: number, r: any) => s + Number(r.amount), 0);
  const totalIncome = incomes.reduce((s: number, r: any) => s + Number(r.amount), 0);

  // Category breakdown for expenses
  const catTotals = new Map<string, number>();
  for (const r of expenses) {
    const label = catMap.get(r.category_id ?? "") ?? "未分類";
    catTotals.set(label, (catTotals.get(label) ?? 0) + Number(r.amount));
  }
  const catBreakdown: CategorySummary[] = Array.from(catTotals.entries())
    .map(([categoryLabel, total]) => ({ categoryLabel, total, count: 0 }))
    .sort((a, b) => b.total - a.total);

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(year, month, 0).getDate();

  switch (intent.type) {
    case "total_expense": {
      const avgDaily = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;
      const daysLeft = daysInMonth - dayOfMonth;
      const projected = totalExpense + avgDaily * daysLeft;
      let ans = `📊 本月（${year} 年 ${month} 月）截至目前，`;
      ans += `總支出為 **${formatTWD(totalExpense)}**。`;
      if (totalExpense > 0) {
        ans += ` 日均支出約 ${formatTWD(Math.round(avgDaily))}。`;
        if (daysLeft > 0) {
          ans += ` 若按目前節奏，月底推估支出約 ${formatTWD(Math.round(projected))}。`;
        }
      }
      return { answer: ans };
    }

    case "total_income": {
      let ans = `💰 本月（${year} 年 ${month} 月）截至目前，`;
      ans += `總收入為 **${formatTWD(totalIncome)}**。`;
      if (totalExpense > 0) {
        const net = totalIncome - totalExpense;
        ans += ` 扣除支出 ${formatTWD(totalExpense)}，`;
        if (net >= 0) ans += `結餘 **${formatTWD(net)}** 💚`;
        else ans += `超支 **${formatTWD(Math.abs(net))}** ⚠️`;
      }
      return { answer: ans };
    }

    case "top_category": {
      if (catBreakdown.length === 0) {
        return { answer: "📭 本月尚無支出紀錄。" };
      }
      const top = catBreakdown[0];
      const totalPct = totalExpense > 0 ? ((top.total / totalExpense) * 100).toFixed(1) : "0";
      let ans = `🏆 本月花最多的分類是 **${top.categoryLabel}**，`;
      ans += `花了 ${formatTWD(top.total)}（佔總支出的 ${totalPct}%）。`;
      if (catBreakdown.length > 1) {
        ans += `\n\n📋 前 5 名排行：`;
        catBreakdown.slice(0, 5).forEach((c, i) => {
          const pct = totalExpense > 0 ? ((c.total / totalExpense) * 100).toFixed(1) : "0";
          ans += `\n${i + 1}. ${c.categoryLabel}：${formatTWD(c.total)}（${pct}%）`;
        });
      }
      return { answer: ans };
    }

    case "category_query": {
      const kw = intent.keywords[0].toLowerCase();
      // Find matching categories (fuzzy)
      const matching = catBreakdown.filter((c) =>
        c.categoryLabel.toLowerCase().includes(kw),
      );
      if (matching.length === 0) {
        return { answer: `🔍 本月沒有找到分類包含「${intent.keywords[0]}」的支出。` };
      }
      if (matching.length === 1) {
        const m = matching[0];
        const pct = totalExpense > 0 ? ((m.total / totalExpense) * 100).toFixed(1) : "0";
        return {
          answer: `🍽️ **${m.categoryLabel}** 本月花了 ${formatTWD(m.total)}，佔總支出的 ${pct}%。`,
        };
      }
      let ans = `📋 以下分類本月開銷：`;
      matching.forEach((m) => {
        const pct = totalExpense > 0 ? ((m.total / totalExpense) * 100).toFixed(1) : "0";
        ans += `\n• ${m.categoryLabel}：${formatTWD(m.total)}（${pct}%）`;
      });
      return { answer: ans };
    }

    case "summary":
    default: {
      // Full monthly summary in natural language
      const net = totalIncome - totalExpense;
      const top3 = catBreakdown.slice(0, 3);
      const avgDaily = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;
      const daysLeft = daysInMonth - dayOfMonth;
      const projected = totalExpense + avgDaily * daysLeft;

      let ans = `📋 **${year} 年 ${month} 月收支摘要**\n\n`;
      ans += `💰 收入：**${formatTWD(totalIncome)}**\n`;
      ans += `💳 支出：**${formatTWD(totalExpense)}**\n`;
      ans += net >= 0
        ? `🟢 結餘：**${formatTWD(net)}**`
        : `🔴 超支：**${formatTWD(Math.abs(net))}**`;

      if (top3.length > 0) {
        ans += `\n\n📊 支出前三名：`;
        top3.forEach((c, i) => {
          const pct = totalExpense > 0 ? ((c.total / totalExpense) * 100).toFixed(1) : "0";
          ans += `\n${i + 1}. ${c.categoryLabel}：${formatTWD(c.total)}（${pct}%）`;
        });
      }

      if (totalExpense > 0 && dayOfMonth > 0) {
        ans += `\n\n📈 日均支出：${formatTWD(Math.round(avgDaily))}`;
        if (daysLeft > 0) {
          ans += `，推估月底總支出約 ${formatTWD(Math.round(projected))}`;
        }
      }

      ans += `\n\n💡 需要了解其他資訊嗎？試試問「伙食花了多少」「哪個分類花最多」「這個月總共花多少」。`;
      return { answer: ans };
    }
  }
}

/* ─── Component ─── */

export default function AiAdvisor() {
  const [supabase] = useState(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  });

  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [state, setState] = useState<AdvisorState>({ status: "idle" });
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleAsk = useCallback(async () => {
    if (!supabase) {
      setState({ status: "failure", message: "Runtime 設定不完整" });
      return;
    }
    if (!question.trim()) return;

    const sessionResult = await supabase.auth.getSession();
    if (!sessionResult.data.session) {
      setState({ status: "failure", message: "請先登入" });
      return;
    }

    setState({ status: "loading" });

    try {
      const intent = detectIntent(question);
      const result = await queryData(supabase, intent);
      setState({ status: "success", data: result.answer });
    } catch (e) {
      setState({ status: "failure", message: "查詢時發生錯誤，請稍後再試。" });
    }
  }, [supabase, question]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className={`advisor-card${open ? " advisor-card-open" : ""}`}>
      {/* Header */}
      <button
        className="advisor-header"
        onClick={() => setOpen(!open)}
        type="button"
        aria-expanded={open}
      >
        <div className="advisor-header-left">
          <span className="advisor-icon">🤖</span>
          <span className="advisor-title">AI 記帳顧問</span>
        </div>
        <span className={`advisor-chevron${open ? " advisor-chevron-open" : ""}`}>
          ▾
        </span>
      </button>

      {/* Body */}
      {open && (
        <div className="advisor-body">
          <div className="advisor-intro">
            問我任何關於本月財務的問題！例如：
            <br />
            「這個月伙食花了多少」
            <br />
            「哪個分類花最多」
            <br />
            「這個月總共花多少」
          </div>

          <div className="advisor-input-row">
            <textarea
              ref={inputRef}
              className="advisor-input"
              placeholder="輸入你的問題…"
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className="advisor-submit"
              onClick={handleAsk}
              disabled={state.status === "loading" || !question.trim()}
              type="button"
            >
              {state.status === "loading" ? "思考中…" : "送出"}
            </button>
          </div>

          {/* Result */}
          {state.status === "loading" && (
            <div className="advisor-result advisor-loading">
              <div className="advisor-spinner" />
              <span>正在查詢你的財務資料…</span>
            </div>
          )}
          {state.status === "success" && (
            <div className="advisor-result advisor-success">
              {state.data}
            </div>
          )}
          {state.status === "failure" && (
            <div className="advisor-result advisor-error">
              ❌ {state.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
