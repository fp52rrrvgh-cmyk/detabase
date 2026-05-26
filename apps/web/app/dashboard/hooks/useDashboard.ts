"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { runtimeConfig } from "../../constants";

export type DashboardSummary = {
  todayExpense: number;
  thisMonthExpense: number;
  thisMonthIncome: number;
  last7DaysExpense: number;
  topCategories: { label: string; amount: number; currency: string }[];
  dailyTrend: { date: string; amount: number }[];
  budgets: {
    categoryId: string;
    categoryLabel: string;
    limitAmount: number;
    spent: number;
    currency: string;
  }[];
  briefing: string;
};

export type DashboardState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: DashboardSummary }
  | { status: "failure"; message: string };

function localDateNow(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function localMonthStart(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}

function local7DaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function useDashboard() {
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) {
      return null;
    }
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const [state, setState] = useState<DashboardState>({ status: "idle" });
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    if (!supabase) {
      setState({ status: "failure", message: "Runtime 設定不完整" });
      return;
    }

    // Don't reload if already successful (until user explicitly calls reload)
    if (loadedRef.current) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setState({ status: "failure", message: "請先登入" });
      return;
    }

    setState({ status: "loading" });

    try {
      const today = localDateNow();
      const monthStart = localMonthStart();
      const weekAgo = local7DaysAgo();

      // Fetch activities for this month range (from month start to today)
      const { data: activities, error } = await supabase
        .from("finance_activities")
        .select("id,activity_date,movement_type,amount,currency,category_id")
        .gte("activity_date", monthStart)
        .lte("activity_date", today)
        .order("activity_date", { ascending: true })
        .limit(1000);

      if (error) {
        setState({ status: "failure", message: "讀取資料失敗" });
        return;
      }

      const rows = (activities ?? []) as {
        id: string;
        activity_date: string;
        movement_type: string;
        amount: number | string;
        currency: string;
        category_id: string | null;
      }[];

      // Category name lookup
      const { data: categories } = await supabase
        .from("finance_categories")
        .select("id,display_name")
        .limit(500);

      const catMap = new Map(
        (categories ?? []).map((c: { id: string; display_name: string | null }) => [
          c.id,
          c.display_name?.trim() || "未命名分類",
        ]),
      );

      // Fetch budgets for this month
      const budgetYear = monthStart.slice(0, 4);
      const budgetMonth = monthStart.slice(5, 7);
      const { data: budgetRows } = await supabase
        .from("finance_budgets")
        .select("category_id,budget_year,budget_month,limit_amount")
        .eq("budget_year", budgetYear)
        .eq("budget_month", parseInt(budgetMonth, 10))
        .limit(500);

      // Filter expenses only
      const expenses = rows.filter((r) => r.movement_type === "expense");

      // Today
      const todayExpense = expenses
        .filter((r) => r.activity_date === today)
        .reduce((s, r) => s + Number(r.amount), 0);

      // This month
      const thisMonthExpense = expenses.reduce(
        (s, r) => s + Number(r.amount),
        0,
      );

      // Last 7 days
      const last7DaysExpense = expenses
        .filter((r) => r.activity_date >= weekAgo)
        .reduce((s, r) => s + Number(r.amount), 0);

      // Top 5 categories this month
      const catTotals = new Map<
        string,
        { label: string; amount: number; currency: string }
      >();
      for (const r of expenses) {
        const label = catMap.get(r.category_id ?? "") ?? "未分類";
        const cur = r.currency || "TWD";
        const key = `${label}\x00${cur}`;
        const existing = catTotals.get(key);
        if (existing) {
          existing.amount += Number(r.amount);
        } else {
          catTotals.set(key, { label, amount: Number(r.amount), currency: cur });
        }
      }
      const topCategories = Array.from(catTotals.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Daily trend this month
      const dailyMap = new Map<string, number>();
      for (const r of expenses) {
        dailyMap.set(
          r.activity_date,
          (dailyMap.get(r.activity_date) ?? 0) + Number(r.amount),
        );
      }
      const dailyTrend: { date: string; amount: number }[] = [];
      const current = new Date(monthStart);
      const end = new Date(today);
      while (current <= end) {
        const ds = current.toISOString().slice(0, 10);
        dailyTrend.push({ date: ds, amount: dailyMap.get(ds) ?? 0 });
        current.setDate(current.getDate() + 1);
      }

      // Build budget progress
      const budgetList: DashboardSummary["budgets"] = [];
      const budgetMap = new Map<string, number>();
      for (const b of (budgetRows ?? []) as { category_id: string; limit_amount: number }[]) {
        const existing = budgetMap.get(b.category_id) ?? 0;
        budgetMap.set(b.category_id, existing + b.limit_amount);
      }
      const spentByCat = new Map<string, number>();
      for (const r of expenses) {
        const cid = r.category_id ?? "";
        spentByCat.set(cid, (spentByCat.get(cid) ?? 0) + Number(r.amount));
      }
      for (const [catId, limitAmount] of budgetMap) {
        budgetList.push({
          categoryId: catId,
          categoryLabel: catMap.get(catId) ?? "未分類",
          limitAmount,
          spent: spentByCat.get(catId) ?? 0,
          currency: "TWD",
        });
      }

      // Income this month
      const thisMonthIncome = rows
        .filter((r) => r.movement_type === "income")
        .reduce((s, r) => s + Number(r.amount), 0);

      // Briefing
      const dayOfMonth = new Date().getDate();
      const avgDaily = dayOfMonth > 0 ? thisMonthExpense / dayOfMonth : 0;
      const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - dayOfMonth;
      const projectedTotal = thisMonthExpense + avgDaily * daysLeft;

      const budgetTotal = budgetList.reduce((s, b) => s + b.limitAmount, 0);
      const totalRemaining = budgetTotal - thisMonthExpense;
      const topCat = topCategories[0];

      let briefing = "";
      if (thisMonthIncome > 0) {
        briefing = `本月收入 TWD ${thisMonthIncome.toLocaleString()}，支出 TWD ${thisMonthExpense.toLocaleString()}，`;
        const net = thisMonthIncome - thisMonthExpense;
        if (net > 0) {
          briefing += `結餘 TWD ${net.toLocaleString()}（${((net / thisMonthIncome) * 100).toFixed(0)}%）。`;
        } else {
          briefing += `超支 TWD ${Math.abs(net).toLocaleString()}，支出是收入的 ${((thisMonthExpense / thisMonthIncome) * 100).toFixed(0)}%。`;
        }
      } else {
        briefing = `本月已支出 TWD ${thisMonthExpense.toLocaleString()}。`;
      }

      if (budgetTotal > 0) {
        const budgetPct = (thisMonthExpense / budgetTotal) * 100;
        briefing += ` 預算已用 ${budgetPct.toFixed(0)}%，剩 TWD ${totalRemaining.toLocaleString()}。`;
        if (totalRemaining < 0) {
          briefing += ` ⚠️ 已超支 TWD ${Math.abs(totalRemaining).toLocaleString()}！`;
        } else if (budgetPct > 80) {
          briefing += ` ⚠️ 接近上限，注意開支。`;
        }
      }

      if (topCat) {
        briefing += ` 最大開銷：${topCat.label}（TWD ${topCat.amount.toLocaleString()}）。`;
      }

      const projectedPct = budgetTotal > 0 ? (projectedTotal / budgetTotal) * 100 : 0;
      if (projectedTotal > thisMonthExpense && projectedPct <= 100 && budgetTotal > 0) {
        briefing += ` 推估月底約花 TWD ${projectedTotal.toLocaleString()}（預算 ${projectedPct.toFixed(0)}%）。`;
      } else if (projectedTotal > budgetTotal && budgetTotal > 0) {
        briefing += ` 按目前節奏，月底可能超支 TWD ${(projectedTotal - budgetTotal).toLocaleString()}。`;
      }

      setState({
        status: "success",
        data: {
          todayExpense,
          thisMonthExpense,
          thisMonthIncome,
          last7DaysExpense,
          topCategories,
          dailyTrend,
          budgets: budgetList,
          briefing,
        },
      });
      loadedRef.current = true;
    } catch {
      setState({ status: "failure", message: "資料載入異常" });
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  const reload = useCallback(() => {
    loadedRef.current = false;
    setState({ status: "idle" });
    void load();
  }, [load]);

  return { state, reload };
}
