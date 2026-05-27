"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { runtimeConfig } from "../../constants";

export type AccountSummary = {
  id: string;
  displayName: string;
  accountType: string;
  initialBalance: number;
  balance: number;
  creditLimit: number | null;
  totalLoan: number | null;
  currency: string;
};

export type DashboardSummary = {
  todayExpense: number;
  todayIncome: number;
  thisMonthExpense: number;
  thisMonthIncome: number;
  last7DaysExpense: number;
  totalBalance: number;
  accounts: AccountSummary[];
  topCategories: { label: string; amount: number; currency: string }[];
  dailyTrend: { date: string; amount: number }[];
  recentTransactions: {
    id: string;
    date: string;
    description: string;
    amount: number;
    movementType: string;
    categoryLabel: string;
  }[];
  pendingReviewCount: number;
  budgets: {
    categoryId: string;
    categoryLabel: string;
    limitAmount: number;
    spent: number;
    currency: string;
  }[];
  briefing: string;
  upcomingSubscriptions: {
    id: string;
    description: string;
    amount: number;
    movementType: string;
    frequency: string;
    nextDate: string;
    categoryLabel: string;
  }[];
  // Desktop-only: extended data
  monthlyHistory: { year: number; month: number; expense: number; income: number }[];
  topCategoriesFull: { label: string; amount: number; pct: number; currency: string }[];
};

export type DashboardState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: DashboardSummary }
  | { status: "failure"; message: string };

function pad2(n: number): string { return String(n).padStart(2, "0"); }

function localDateNow(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function localMonthStart(year: number, month: number): string {
  return `${year}-${pad2(month)}-01`;
}

function localMonthEnd(year: number, month: number): string {
  return `${year}-${pad2(month)}-${new Date(year, month, 0).getDate()}`;
}

function last6Months(year: number, month: number): { y: number; m: number }[] {
  const result: { y: number; m: number }[] = [];
  let y = year, m = month;
  for (let i = 0; i < 6; i++) {
    result.push({ y, m });
    m--;
    if (m === 0) { m = 12; y--; }
  }
  return result;
}

export function useDashboard(targetYear?: number, targetMonth?: number) {
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const [state, setState] = useState<DashboardState>({ status: "idle" });
  const loadedRef = useRef(false);
  const year = targetYear ?? new Date().getFullYear();
  const month = targetMonth ?? new Date().getMonth() + 1;
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth() + 1;

  const load = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    if (!supabase) {
      setState({ status: "failure", message: "Runtime 設定不完整" });
      return;
    }

    if (loadedRef.current) return;
    if (signal?.aborted) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setState({ status: "failure", message: "請先登入" });
      return;
    }

    setState({ status: "loading" });

    try {
      const today = localDateNow();
      const monthStart = localMonthStart(year, month);
      const monthEnd = localMonthEnd(year, month);
      const weekAgo = isCurrentMonth ? localDateNow() : monthEnd;
      const weekAgoDate = new Date(weekAgo);
      weekAgoDate.setDate(weekAgoDate.getDate() - 6);
      const weekAgoStr = weekAgoDate.toISOString().slice(0, 10);

      // --- Parallel queries ---
      const activityPromise = supabase
        .from("finance_activities")
        .select("id,activity_date,movement_type,amount,currency,category_id")
        .gte("activity_date", monthStart)
        .lte("activity_date", monthEnd)
        .order("activity_date", { ascending: true })
        .limit(1000);

      const catPromise = supabase
        .from("finance_categories")
        .select("id,display_name")
        .limit(500);

      const accountPromise = supabase
        .from("finance_accounts")
        .select("id,display_name,account_type,initial_balance,credit_limit,total_loan")
        .eq("is_active", true)
        .limit(50);

      const incomeBalancePromise = supabase
        .from("finance_activities")
        .select("account_id, amount:amount.sum()")
        .eq("movement_type", "income")
        .limit(5000);

      const expenseBalancePromise = supabase
        .from("finance_activities")
        .select("account_id, amount:amount.sum()")
        .eq("movement_type", "expense")
        .limit(5000);

      const budgetYear = String(year);
      const budgetMonthStr = pad2(month);
      const budgetPromise = supabase
        .from("finance_budgets")
        .select("category_id,budget_year,budget_month,limit_amount")
        .eq("budget_year", budgetYear)
        .eq("budget_month", month)
        .limit(500);

      const recentPromise = supabase
        .from("finance_activities")
        .select("id,activity_date,description,amount,movement_type,category_id")
        .order("activity_date", { ascending: false })
        .limit(10);

      const reviewPromise = supabase
        .from("finance_activity_corrections")
        .select("id", { count: "exact", head: true });

      // Subscriptions (only for current/upcoming months)
      const todayStr = localDateNow();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const thirtyDaysStr = thirtyDaysLater.toISOString().slice(0, 10);
      const subPromise = supabase
        .from("finance_subscriptions")
        .select("id,description,amount,movement_type,frequency,next_date,category_id")
        .eq("is_active", true)
        .gte("next_date", todayStr)
        .lte("next_date", thirtyDaysStr)
        .order("next_date", { ascending: true })
        .limit(20);

      // Monthly history — last 6 months for desktop trend
      const historyMonths = last6Months(year, month);
      const historyPromises = historyMonths.map(({ y, m }) => {
        const ms = localMonthStart(y, m);
        const me = localMonthEnd(y, m);
        return supabase
          .from("finance_activities")
          .select("movement_type,amount")
          .gte("activity_date", ms)
          .lte("activity_date", me)
          .limit(2000);
      });

      const [
        { data: activities, error },
        { data: categories },
        { data: accountRows },
        { data: balanceIncome },
        { data: balanceExpense },
        { data: budgetRows },
        { data: recentActivity },
        { count: reviewCount },
        { data: subRows },
        ...historyResults
      ] = await Promise.all([
        activityPromise, catPromise, accountPromise,
        incomeBalancePromise, expenseBalancePromise,
        budgetPromise, recentPromise, reviewPromise, subPromise,
        ...historyPromises,
      ]);

      if (error) {
        setState({ status: "failure", message: "讀取資料失敗" });
        return;
      }

      const rows = (activities ?? []) as any[];
      const catMap = new Map(
        (categories ?? []).map((c: any) => [c.id, c.display_name?.trim() || "未命名分類"]),
      );
      const allAccounts = (accountRows ?? []) as any[];

      // Balances: initial_balance + income - expense
      const incomeMap = new Map<string, number>(
        ((balanceIncome ?? []) as any[]).map((r) => [r.account_id, Number(r.amount)]),
      );
      const expenseMap = new Map<string, number>(
        ((balanceExpense ?? []) as any[]).map((r) => [r.account_id, Number(r.amount)]),
      );
      const accounts: AccountSummary[] = allAccounts.map((a) => ({
        id: a.id,
        displayName: a.display_name,
        accountType: a.account_type,
        initialBalance: Number(a.initial_balance ?? 0),
        balance: Number(a.initial_balance ?? 0) + (incomeMap.get(a.id) ?? 0) - (expenseMap.get(a.id) ?? 0),
        creditLimit: a.credit_limit ?? null,
        totalLoan: a.total_loan ?? null,
        currency: "TWD",
      }));
      const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

      const expenses = rows.filter((r: any) => r.movement_type === "expense");
      const todayExpense = isCurrentMonth
        ? expenses.filter((r: any) => r.activity_date === today).reduce((s: number, r: any) => s + Number(r.amount), 0)
        : 0;
      const thisMonthExpense = expenses.reduce((s: number, r: any) => s + Number(r.amount), 0);
      const last7DaysExpense = expenses
        .filter((r: any) => r.activity_date >= weekAgoStr)
        .reduce((s: number, r: any) => s + Number(r.amount), 0);
      const thisMonthIncome = rows
        .filter((r: any) => r.movement_type === "income")
        .reduce((s: number, r: any) => s + Number(r.amount), 0);
      const todayIncome = isCurrentMonth
        ? rows.filter((r: any) => r.movement_type === "income" && r.activity_date === today).reduce((s: number, r: any) => s + Number(r.amount), 0)
        : 0;

      // Categories
      const catTotals = new Map<string, { label: string; amount: number; currency: string }>();
      for (const r of expenses) {
        const label = catMap.get(r.category_id ?? "") ?? "未分類";
        const cur = r.currency || "TWD";
        const key = `${label}\x00${cur}`;
        const existing = catTotals.get(key);
        if (existing) existing.amount += Number(r.amount);
        else catTotals.set(key, { label, amount: Number(r.amount), currency: cur });
      }
      const topCategories = Array.from(catTotals.values()).sort((a, b) => b.amount - a.amount).slice(0, 5);
      const totalExpense = thisMonthExpense || 1;
      const topCategoriesFull = Array.from(catTotals.values())
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map((c) => ({ ...c, pct: Math.round((c.amount / totalExpense) * 100) }));

      // Daily trend
      const dailyMap = new Map<string, number>();
      for (const r of expenses) dailyMap.set(r.activity_date, (dailyMap.get(r.activity_date) ?? 0) + Number(r.amount));
      const dailyTrend: { date: string; amount: number }[] = [];
      const current = new Date(monthStart);
      const end = new Date(isCurrentMonth ? today : monthEnd);
      while (current <= end) {
        const ds = current.toISOString().slice(0, 10);
        dailyTrend.push({ date: ds, amount: dailyMap.get(ds) ?? 0 });
        current.setDate(current.getDate() + 1);
      }

      // Budgets
      const budgetList: DashboardSummary["budgets"] = [];
      const budgetMap = new Map<string, number>();
      for (const b of (budgetRows ?? []) as any[]) {
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

      // Briefing
      const dayOfMonth = isCurrentMonth ? new Date().getDate() : new Date(year, month, 0).getDate();
      const avgDaily = dayOfMonth > 0 ? thisMonthExpense / dayOfMonth : 0;
      const daysLeft = new Date(year, month, 0).getDate() - dayOfMonth;
      const projectedTotal = thisMonthExpense + avgDaily * daysLeft;
      const budgetTotal = budgetList.reduce((s, b) => s + b.limitAmount, 0);
      const totalRemaining = budgetTotal - thisMonthExpense;
      const topCat = topCategories[0];
      let briefing = "";
      if (thisMonthIncome > 0) {
        briefing = `本月收入 TWD ${thisMonthIncome.toLocaleString()}，支出 TWD ${thisMonthExpense.toLocaleString()}，`;
        const net = thisMonthIncome - thisMonthExpense;
        if (net > 0) briefing += `結餘 TWD ${net.toLocaleString()}（${((net / thisMonthIncome) * 100).toFixed(0)}%）。`;
        else briefing += `超支 TWD ${Math.abs(net).toLocaleString()}，支出是收入的 ${((thisMonthExpense / thisMonthIncome) * 100).toFixed(0)}%。`;
      } else {
        briefing = `本月已支出 TWD ${thisMonthExpense.toLocaleString()}。`;
      }
      if (budgetTotal > 0) {
        const budgetPct = (thisMonthExpense / budgetTotal) * 100;
        briefing += ` 預算已用 ${budgetPct.toFixed(0)}%，剩 TWD ${totalRemaining.toLocaleString()}。`;
        if (totalRemaining < 0) briefing += ` ⚠️ 已超支 TWD ${Math.abs(totalRemaining).toLocaleString()}！`;
        else if (budgetPct > 80) briefing += ` ⚠️ 接近上限，注意開支。`;
      }
      if (topCat) briefing += ` 最大開銷：${topCat.label}（TWD ${topCat.amount.toLocaleString()}）。`;
      const projectedPct = budgetTotal > 0 ? (projectedTotal / budgetTotal) * 100 : 0;
      if (projectedTotal > thisMonthExpense && projectedPct <= 100 && budgetTotal > 0)
        briefing += ` 推估月底約花 TWD ${projectedTotal.toLocaleString()}（預算 ${projectedPct.toFixed(0)}%）。`;
      else if (projectedTotal > budgetTotal && budgetTotal > 0)
        briefing += ` 按目前節奏，月底可能超支 TWD ${(projectedTotal - budgetTotal).toLocaleString()}。`;

      // Recent transactions
      const recentRows = (recentActivity ?? []) as any[];
      const recentTransactions = recentRows.map((r: any) => ({
        id: r.id, date: r.activity_date,
        description: r.description?.trim() || "無備註",
        amount: Number(r.amount), movementType: r.movement_type,
        categoryLabel: catMap.get(r.category_id ?? "") ?? "未分類",
      }));

      const pendingReviewCount = reviewCount ?? 0;

      // Monthly history for desktop
      const monthlyHistory: { year: number; month: number; expense: number; income: number }[] = [];
      for (let i = 0; i < historyMonths.length; i++) {
        const hm = historyMonths[i];
        const histData = (historyResults[i]?.data ?? []) as any[];
        monthlyHistory.push({
          year: hm.y, month: hm.m,
          expense: histData.filter((r: any) => r.movement_type === "expense").reduce((s: number, r: any) => s + Number(r.amount), 0),
          income: histData.filter((r: any) => r.movement_type === "income").reduce((s: number, r: any) => s + Number(r.amount), 0),
        });
      }

      setState({
        status: "success",
        data: {
          todayExpense, todayIncome, thisMonthExpense, thisMonthIncome,
          last7DaysExpense, totalBalance, accounts, topCategories, dailyTrend,
          recentTransactions, pendingReviewCount, budgets: budgetList, briefing,
          upcomingSubscriptions: ((subRows ?? []) as any[]).map((s: any) => ({
            id: s.id, description: s.description, amount: Number(s.amount),
            movementType: s.movement_type, frequency: s.frequency,
            nextDate: s.next_date, categoryLabel: catMap.get(s.category_id ?? "") ?? "未分類",
          })),
          monthlyHistory,
          topCategoriesFull,
        },
      });
      loadedRef.current = true;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setState({ status: "failure", message: "資料載入異常" });
    }
  }, [supabase, year, month, isCurrentMonth]);

  useEffect(() => {
    const controller = new AbortController();
    loadedRef.current = false;
    void load({ signal: controller.signal });
    return () => controller.abort();
  }, [load]);

  const reload = useCallback(() => {
    loadedRef.current = false;
    setState({ status: "idle" });
    void load();
  }, [load]);

  return { state, reload, year, month, isCurrentMonth };
}
