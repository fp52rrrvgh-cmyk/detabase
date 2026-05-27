"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { runtimeConfig } from "../../constants";

type AnomalyType = "spike" | "drop" | "large_tx";

type AnomalyItem = {
  type: AnomalyType;
  categoryLabel?: string;
  thisMonth: number;
  lastMonth: number;
  ratio: number;
  description: string;
};

type AnomalyResult =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; anomalies: AnomalyItem[]; dailyAvg: number };

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

export function AnomalyDetection() {
  const [result, setResult] = useState<AnomalyResult>({ status: "loading" });

  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey)
      return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!supabase) {
        setResult({ status: "error", message: "Runtime 設定不完整" });
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setResult({ status: "error", message: "請先登入" });
        return;
      }

      const now = new Date();
      const thisYear = now.getFullYear();
      const thisMonthNum = now.getMonth() + 1; // 1-indexed
      const lastYear = thisMonthNum === 1 ? thisYear - 1 : thisYear;
      const lastMonthNum = thisMonthNum === 1 ? 12 : thisMonthNum - 1;

      const thisStart = monthStart(thisYear, thisMonthNum);
      const thisEnd = monthEnd(thisYear, thisMonthNum);

      const lastStart = monthStart(lastYear, lastMonthNum);
      const lastEnd = monthEnd(lastYear, lastMonthNum);

      // Fetch this month expenses
      const thisPromise = supabase
        .from("finance_activities")
        .select("amount, category_id, activity_date")
        .eq("movement_type", "expense")
        .gte("activity_date", thisStart)
        .lte("activity_date", thisEnd)
        .limit(2000);

      // Fetch last month expenses
      const lastPromise = supabase
        .from("finance_activities")
        .select("amount, category_id, activity_date")
        .eq("movement_type", "expense")
        .gte("activity_date", lastStart)
        .lte("activity_date", lastEnd)
        .limit(2000);

      // Fetch categories for label mapping
      const catPromise = supabase
        .from("finance_categories")
        .select("id, display_name")
        .limit(500);

      const [{ data: thisData, error: thisErr }, { data: lastData, error: lastErr }, { data: catData }] =
        await Promise.all([thisPromise, lastPromise, catPromise]);

      if (cancelled) return;

      if (thisErr || lastErr) {
        setResult({ status: "error", message: "讀取資料失敗" });
        return;
      }

      const catMap = new Map<string, string>();
      for (const c of catData ?? []) {
        catMap.set(c.id, c.display_name?.trim() || "未命名分類");
      }

      const thisRows = (thisData ?? []) as any[];
      const lastRows = (lastData ?? []) as any[];

      // Group by category for this month
      const thisCatTotals = new Map<string, number>();
      const thisSingleTx = new Map<string, number[]>();
      for (const r of thisRows) {
        const cid = r.category_id ?? "";
        thisCatTotals.set(cid, (thisCatTotals.get(cid) ?? 0) + Number(r.amount));
        if (!thisSingleTx.has(cid)) thisSingleTx.set(cid, []);
        thisSingleTx.get(cid)!.push(Number(r.amount));
      }

      // Group by category for last month
      const lastCatTotals = new Map<string, number>();
      for (const r of lastRows) {
        const cid = r.category_id ?? "";
        lastCatTotals.set(cid, (lastCatTotals.get(cid) ?? 0) + Number(r.amount));
      }

      // Daily average for this month
      const dayCount = new Date().getDate();
      const thisMonthTotal = thisRows.reduce((s, r) => s + Number(r.amount), 0);
      const dailyAvg = dayCount > 0 ? thisMonthTotal / dayCount : 0;
      const largeTxThreshold = dailyAvg * 5;

      const anomalies: AnomalyItem[] = [];

      // Compare this month vs last month for each category
      const allCats = new Set([...thisCatTotals.keys(), ...lastCatTotals.keys()]);
      for (const cid of allCats) {
        const thisAmt = thisCatTotals.get(cid) ?? 0;
        const lastAmt = lastCatTotals.get(cid) ?? 0;
        const label = catMap.get(cid) ?? "未分類";

        if (lastAmt > 0 && thisAmt > lastAmt * 2) {
          const ratio = thisAmt / lastAmt;
          anomalies.push({
            type: "spike",
            categoryLabel: label,
            thisMonth: thisAmt,
            lastMonth: lastAmt,
            ratio,
            description: `${label} 本月支出 ${formatTWD(thisAmt)}，是上月 ${formatTWD(lastAmt)} 的 ${ratio.toFixed(1)} 倍 ⚠️`,
          });
        }

        if (lastAmt > 0 && thisAmt < lastAmt * 0.5) {
          const ratio = lastAmt / Math.max(thisAmt, 1);
          anomalies.push({
            type: "drop",
            categoryLabel: label,
            thisMonth: thisAmt,
            lastMonth: lastAmt,
            ratio,
            description: `${label} 本月支出 ${formatTWD(thisAmt)}，比上月 ${formatTWD(lastAmt)} 減少 ${((1 - thisAmt / lastAmt) * 100).toFixed(0)}% ✅`,
          });
        }
      }

      // Large single transactions
      const todayStr = now.toISOString().slice(0, 10);
      for (const r of thisRows) {
        if (r.activity_date === todayStr && Number(r.amount) >= largeTxThreshold) {
          const label = catMap.get(r.category_id ?? "") ?? "未分類";
          anomalies.push({
            type: "large_tx",
            categoryLabel: label,
            thisMonth: Number(r.amount),
            lastMonth: 0,
            ratio: Number(r.amount) / Math.max(dailyAvg, 1),
            description: `今日有一筆 ${label} 支出 ${formatTWD(Number(r.amount))}，是日均支出 ${formatTWD(Math.round(dailyAvg))} 的 ${(Number(r.amount) / Math.max(dailyAvg, 1)).toFixed(1)} 倍 🔔`,
          });
        }
      }

      // Sort: large_tx first, then spike, then drop; limit to 5
      anomalies.sort((a, b) => {
        const order = { large_tx: 0, spike: 1, drop: 2 };
        return order[a.type] - order[b.type];
      });

      if (cancelled) return;
      setResult({ status: "success", anomalies: anomalies.slice(0, 5), dailyAvg });
    }

    run();
    return () => { cancelled = true; };
  }, [supabase]);

  const icon: Record<AnomalyType, string> = {
    spike: "📈",
    drop: "📉",
    large_tx: "🔥",
  };

  const typeLabel: Record<AnomalyType, string> = {
    spike: "異常增加",
    drop: "異常減少",
    large_tx: "大額支出",
  };

  return (
    <div className="d-card anomaly-card">
      <div className="d-card-h">
        <span className="d-card-t">🔍 異常偵測</span>
      </div>
      {result.status === "loading" ? (
        <p className="status-message status-muted">分析中…</p>
      ) : result.status === "error" ? (
        <p className="status-message status-error" role="alert">{result.message}</p>
      ) : result.anomalies.length === 0 ? (
        <p className="anomaly-none">✅ 本月無異常支出</p>
      ) : (
        <div className="anomaly-list">
          {result.anomalies.map((a, idx) => (
            <div key={idx} className={`anomaly-item anomaly-${a.type}`}>
              <div className="anomaly-item-header">
                <span className="anomaly-icon">{icon[a.type]}</span>
                <span className="anomaly-type-label">{typeLabel[a.type]}</span>
              </div>
              <p className="anomaly-desc">{a.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
