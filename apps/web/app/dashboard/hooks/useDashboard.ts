"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { runtimeConfig } from "../../constants";

export type DashboardSummary = {
  todayExpense: number;
  thisMonthExpense: number;
  last7DaysExpense: number;
  topCategories: { label: string; amount: number; currency: string }[];
  dailyTrend: { date: string; amount: number }[];
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
  const supabase =
    runtimeConfig.supabaseUrl && runtimeConfig.publishableKey
      ? createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey)
      : null;

  const [state, setState] = useState<DashboardState>({ status: "idle" });

  const load = useCallback(async () => {
    if (!supabase) {
      setState({ status: "failure", message: "Runtime 設定不完整" });
      return;
    }

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

      setState({
        status: "success",
        data: {
          todayExpense,
          thisMonthExpense,
          last7DaysExpense,
          topCategories,
          dailyTrend,
        },
      });
    } catch {
      setState({ status: "failure", message: "資料載入異常" });
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
