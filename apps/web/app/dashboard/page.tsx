"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import { formatAmount } from "../lib/format";

type MonthlyRow = {
  month: number;
  movement_type: string;
  transaction_count: number;
  total_amount: number;
  void_count: number;
};

type CategoryDetail = {
  category_name: string;
  total_amount: number;
};

type DashboardState =
  | { status: "loading" }
  | { status: "loaded"; currentMonth: number; rows: MonthlyRow[]; categories: CategoryDetail[] }
  | { status: "error"; message: string };

function monthLabel(month: number): string {
  const y = Math.floor(month / 100);
  const m = month % 100;
  return `${y} 年 ${m} 月`;
}

function monthShort(month: number): string {
  const m = month % 100;
  return `${m} 月`;
}

const COLORS = ["#0f766e", "#0891b2", "#7c3aed", "#d97706", "#dc2626", "#059669", "#2563eb", "#db2777", "#65a30d", "#9333ea"];

function getSupabaseClient() {
  if (typeof window === "undefined") return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!supabaseUrl || !publishableKey) return null;
  return createClient(supabaseUrl, publishableKey);
}

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState>({ status: "loading" });

  const load = useCallback(async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setState({ status: "error", message: "Supabase 未設定" });
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setState({ status: "error", message: "請先登入" });
      return;
    }

    const [summaryResult, catResult] = await Promise.all([
      supabase
        .from("finance_monthly_summary")
        .select("*")
        .order("month", { ascending: false })
        .limit(24),
      supabase.rpc("get_monthly_category_breakdown"),
    ]);

    if (summaryResult.error) {
      setState({ status: "error", message: summaryResult.error.message });
      return;
    }

    const today = new Date();
    const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1);

    setState({
      status: "loaded",
      currentMonth,
      rows: summaryResult.data as MonthlyRow[],
      categories: (catResult.data ?? []) as CategoryDetail[],
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "loading") return <p className="status-message" role="status">載入儀表板資料...</p>;
  if (state.status === "error") return <p className="status-message status-error" role="alert">{state.message}</p>;

  const { rows, currentMonth, categories } = state;
  const currentRows = rows.filter((r) => r.month === currentMonth);
  const expenseRows = currentRows.filter((r) => r.movement_type === "expense");
  const incomeRows = currentRows.filter((r) => r.movement_type === "income");
  const totalExpense = expenseRows.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalIncome = incomeRows.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalTransactions = currentRows.reduce((s, r) => s + r.transaction_count, 0);

  const months = [...new Set(rows.map((r) => r.month))].sort((a, b) => b - a);

  // Build trend data (ascending order for chart)
  const trendData = [...months].reverse().slice(-12).map((month) => {
    const mRows = rows.filter((r) => r.month === month);
    const mExpense = mRows
      .filter((r) => r.movement_type === "expense")
      .reduce((s, r) => s + Number(r.total_amount), 0);
    const mIncome = mRows
      .filter((r) => r.movement_type === "income")
      .reduce((s, r) => s + Number(r.total_amount), 0);
    return { month: monthShort(month), 支出: mExpense, 收入: mIncome, fullMonth: month };
  });

  return (
    <main className="app-shell dashboard-page">
      <section className="entry-panel" style={{ width: "min(100%, 640px)" }}>
        <div className="page-heading">
          <p className="eyebrow">戰情儀表板</p>
          <h1 id="page-title">財務總覽</h1>
          <p className="summary">
            資料來源：finance_monthly_summary（materialized view）。
          </p>
        </div>

        {/* 本月概覽卡片 */}
        <div className="dashboard-card-strip">
          <article className="dashboard-card dashboard-card--primary">
            <span className="dashboard-card-label">本月支出</span>
            <strong className="dashboard-card-value">{formatAmount(totalExpense, "TWD")}</strong>
            <p className="dashboard-card-context">{monthLabel(currentMonth)}</p>
          </article>
          <article className="dashboard-card dashboard-card--positive">
            <span className="dashboard-card-label">本月收入</span>
            <strong className="dashboard-card-value">{formatAmount(totalIncome, "TWD")}</strong>
            <p className="dashboard-card-context">{monthLabel(currentMonth)}</p>
          </article>
          <article className="dashboard-card">
            <span className="dashboard-card-label">結餘</span>
            <strong className="dashboard-card-value">{formatAmount(totalIncome - totalExpense, "TWD")}</strong>
            <p className="dashboard-card-context">{monthLabel(currentMonth)}</p>
          </article>
          <article className="dashboard-card">
            <span className="dashboard-card-label">交易筆數</span>
            <strong className="dashboard-card-value">{totalTransactions.toLocaleString()}</strong>
            <p className="dashboard-card-context">{monthLabel(currentMonth)}</p>
          </article>
        </div>

        {/* 趨勢圖 */}
        <section className="review-section">
          <div className="section-heading">
            <h3>收支趨勢（近 12 月）</h3>
          </div>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#dc2626" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} width={60} />
                <Tooltip
                  formatter={(value: unknown) => formatAmount(Number(value ?? 0), "TWD")}
                  contentStyle={{ fontSize: 13 }}
                />
                <Area type="monotone" dataKey="支出" stroke="#dc2626" fill="url(#colorExpense)" strokeWidth={2} />
                <Area type="monotone" dataKey="收入" stroke="#059669" fill="url(#colorIncome)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 本月分類圓餅圖 */}
        {categories.length > 0 && (
          <section className="review-section">
            <div className="section-heading">
              <h3>本月支出分類</h3>
            </div>
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="total_amount"
                    nameKey="category_name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={false}
                    labelLine
                  >
                    {categories.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: unknown) => formatAmount(Number(value ?? 0), "TWD")} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* 月度趨勢表（備用） */}
        <section className="review-section">
          <div className="section-heading">
            <h3>月度明細</h3>
          </div>
          <div className="activity-meta" style={{ flexDirection: "column", gap: "0.25rem" }}>
            {months.slice(0, 12).map((month) => {
              const mRows = rows.filter((r) => r.month === month);
              const mExpense = mRows
                .filter((r) => r.movement_type === "expense")
                .reduce((s, r) => s + Number(r.total_amount), 0);
              const mIncome = mRows
                .filter((r) => r.movement_type === "income")
                .reduce((s, r) => s + Number(r.total_amount), 0);
              const mTx = mRows.reduce((s, r) => s + r.transaction_count, 0);

              return (
                <div key={month} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-color, #eee)" }}>
                  <span style={{ fontWeight: 600 }}>{monthLabel(month)}</span>
                  <span style={{ display: "flex", gap: "1.5rem" }}>
                    <span>支出 {formatAmount(mExpense, "TWD")}</span>
                    <span>收入 {formatAmount(mIncome, "TWD")}</span>
                    <span>{mTx} 筆</span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}
