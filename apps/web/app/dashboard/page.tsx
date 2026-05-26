"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";

import { runtimeConfig } from "../constants";
import { formatAmount } from "../lib/format";

type MonthlyRow = {
  month: number;
  movement_type: string;
  transaction_count: number;
  total_amount: number;
  void_count: number;
};

type DashboardState =
  | { status: "loading" }
  | { status: "loaded"; currentMonth: number; rows: MonthlyRow[] }
  | { status: "error"; message: string };

function monthLabel(month: number): string {
  const y = Math.floor(month / 100);
  const m = month % 100;
  return `${y} 年 ${m} 月`;
}

export default function DashboardPage() {
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const [state, setState] = useState<DashboardState>({ status: "loading" });

  const load = useCallback(async () => {
    if (!supabase) {
      setState({ status: "error", message: "Supabase 未設定" });
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setState({ status: "error", message: "請先登入" });
      return;
    }

    const { data, error } = await supabase
      .from("finance_monthly_summary")
      .select("*")
      .order("month", { ascending: false })
      .limit(24);

    if (error) {
      setState({ status: "error", message: error.message });
      return;
    }

    const today = new Date();
    const currentMonth = today.getFullYear() * 100 + (today.getMonth() + 1);

    setState({ status: "loaded", currentMonth, rows: data as MonthlyRow[] });
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.status === "loading") return <p className="status-message" role="status">載入儀表板資料...</p>;
  if (state.status === "error") return <p className="status-message status-error" role="alert">{state.message}</p>;

  const { rows, currentMonth } = state;
  const currentRows = rows.filter((r) => r.month === currentMonth);
  const expenseRows = currentRows.filter((r) => r.movement_type === "expense");
  const incomeRows = currentRows.filter((r) => r.movement_type === "income");
  const totalExpense = expenseRows.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalIncome = incomeRows.reduce((s, r) => s + Number(r.total_amount), 0);
  const totalTransactions = currentRows.reduce((s, r) => s + r.transaction_count, 0);

  const months = [...new Set(rows.map((r) => r.month))].sort((a, b) => b - a);

  return (
    <main className="app-shell dashboard-page">
      <section className="entry-panel">
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
            <strong className="dashboard-card-value">
              {formatAmount(totalExpense, "TWD")}
            </strong>
            <p className="dashboard-card-context">{monthLabel(currentMonth)}</p>
          </article>

          <article className="dashboard-card dashboard-card--positive">
            <span className="dashboard-card-label">本月收入</span>
            <strong className="dashboard-card-value">
              {formatAmount(totalIncome, "TWD")}
            </strong>
            <p className="dashboard-card-context">{monthLabel(currentMonth)}</p>
          </article>

          <article className="dashboard-card">
            <span className="dashboard-card-label">結餘</span>
            <strong className="dashboard-card-value">
              {formatAmount(totalIncome - totalExpense, "TWD")}
            </strong>
            <p className="dashboard-card-context">{monthLabel(currentMonth)}</p>
          </article>

          <article className="dashboard-card">
            <span className="dashboard-card-label">交易筆數</span>
            <strong className="dashboard-card-value">
              {totalTransactions.toLocaleString()}
            </strong>
            <p className="dashboard-card-context">{monthLabel(currentMonth)}</p>
          </article>
        </div>

        {/* 歷史趨勢表格 */}
        <section className="review-section">
          <div className="section-heading">
            <h3>月度趨勢</h3>
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
                <div
                  key={month}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid var(--border-color, #eee)",
                  }}
                >
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
