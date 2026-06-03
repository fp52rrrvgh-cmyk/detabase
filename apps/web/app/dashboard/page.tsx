"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "../hooks/useAuth";
import { runtimeConfig } from "../constants";
import { useDashboard } from "./hooks/useDashboard";
import { ExpensePieChart } from "./components/ExpensePieChart";
import { BudgetBarChart } from "./components/BudgetBarChart";
import { AccountOverviewCard } from "./components/AccountOverviewCard";
import { DashboardSkeleton } from "./components/DashboardSkeleton";
import { ErrorBoundary } from "../components/ErrorBoundary";

function formatTWD(n: number): string {
  return `TWD ${Math.round(n).toLocaleString()}`;
}

function TxItem({ tx, onCopy }: { tx: any; onCopy: () => void }) {
  const [showActions, setShowActions] = useState(false);
  return (
    <>
      <div
        className={`d-tx-item ${showActions ? "d-tx-item-active" : ""}`}
        onClick={() => setShowActions(!showActions)}
      >
        <div className="d-tx-left">
          <span className={`d-tx-icon ${tx.movementType === "income" ? "income" : "expense"}`}>
            {tx.movementType === "income" ? "↓" : "↑"}
          </span>
          <div>
            <div className="d-tx-desc">{tx.description}</div>
            <div className="d-tx-cat">{tx.categoryLabel}</div>
          </div>
        </div>
        <div className={`d-tx-amt ${tx.movementType === "income" ? "income" : "danger"}`}>
          {tx.movementType === "income" ? "+" : "-"}TWD {tx.amount.toLocaleString()}
        </div>
      </div>
      {showActions && (
        <div className="d-tx-actions">
          <button className="d-tx-action-btn" onClick={(e) => { e.stopPropagation(); onCopy(); setShowActions(false); }} type="button">📋 複製</button>
          <button className="d-tx-action-btn" onClick={(e) => { e.stopPropagation(); setShowActions(false); }} type="button">🔗 到 Telegram 修改</button>
        </div>
      )}
    </>
  );
}

export default function DashboardPage() {
  const auth = useAuth(() => {});
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);

  const { state, reload, year, month, isCurrentMonth } = useDashboard(viewYear, viewMonth);

  useEffect(() => {
    if (auth.authStatus === "signed_in") { reload(); }
  }, [auth.authStatus, reload]);

  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const totalBudget = state.status === "success"
    ? state.data.budgets.reduce((s: number, b: any) => s + b.limitAmount, 0)
    : 0;
  const totalCreditAvailable = state.status === "success"
    ? state.data.creditCards.reduce((s: number, c) => s + ((c.creditLimit ?? 0) - c.used), 0)
    : 0;

  function prevMonth() {
    if (viewMonth === 1) { setViewYear((y) => y - 1); setViewMonth(12); }
    else { setViewMonth((m) => m - 1); }
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear((y) => y + 1); setViewMonth(1); }
    else { setViewMonth((m) => m + 1); }
  }
  function goCurrentMonth() {
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth() + 1);
  }

  return (
    <div className="db-page">
      {auth.authStatus !== "signed_in" ? (
        <p className="status-message status-muted" role="status">請先登入以查看財務戰情。</p>
      ) : state.status === "loading" ? (
        <DashboardSkeleton />
      ) : state.status === "failure" ? (
        <p className="status-message status-error" role="alert">{state.message}</p>
      ) : state.status === "success" ? (
        <ErrorBoundary>
          <>
            {/* ===== Header ===== */}
            <div className="d-header">
              <div className="d-header-left">
                <h2 className="d-title">戰情總覽</h2>
                <p className="d-title-sub">{viewYear} 年 {viewMonth} 月</p>
              </div>
              <div className="d-header-right">
                <div className="d-month-nav">
                  <button className="d-month-btn" onClick={prevMonth} type="button">‹</button>
                  <span className="d-month-label" onClick={goCurrentMonth}>
                    {isCurrentMonth ? <><span className="d-month-badge">本月</span></> : <>{viewMonth}月</>}
                  </span>
                  <button className="d-month-btn" onClick={nextMonth} type="button">›</button>
                </div>
                <button className="d-refresh-btn" onClick={() => { reload(); }} type="button">⟳</button>
              </div>
            </div>

            {/* ===== KPI Row ===== */}
            <div className="d-kpi-row">
              <div className="d-kpi">
                <div className="d-kpi-glow balance" />
                <div className="d-kpi-lbl">總資產</div>
                <div className="d-kpi-val net positive">{formatTWD(state.data.totalAssets)}</div>
                <div className="d-kpi-sub">戶頭 + 現金 + 零錢盒</div>
              </div>
              <div className="d-kpi">
                <div className="d-kpi-glow income" />
                <div className="d-kpi-lbl">戶頭</div>
                <div className="d-kpi-val income">{formatTWD(state.data.bankBalance)}</div>
                <div className="d-kpi-sub">銀行存款</div>
              </div>
              <div className="d-kpi">
                <div className="d-kpi-glow net" />
                <div className="d-kpi-lbl">現金</div>
                <div className="d-kpi-val">{formatTWD(state.data.cashOnHand)}</div>
                <div className="d-kpi-sub">錢包現金</div>
              </div>
              <div className="d-kpi">
                <div className="d-kpi-glow expense" />
                <div className="d-kpi-lbl">零錢盒</div>
                <div className="d-kpi-val expense">{formatTWD(state.data.coinBoxBalance)}</div>
                <div className="d-kpi-sub">每日零錢存入</div>
              </div>
              <div className="d-kpi">
                <div className="d-kpi-glow balance" />
                <div className="d-kpi-lbl">信用卡餘額</div>
                <div className={`d-kpi-val ${totalCreditAvailable >= 0 ? "positive" : "negative"}`}>
                  {formatTWD(totalCreditAvailable)}
                </div>
                <div className="d-kpi-sub">可用額度</div>
              </div>
            </div>

            {/* ===== 💳 帳戶總覽 ===== */}
            <AccountOverviewCard
              accounts={state.data.accounts}
              totalBalance={state.data.totalBalance}
            />

            {/* ===== 📊 花費分析 ===== */}
            <div className="d-mid-grid">
              <div className="d-card">
                <div className="d-card-h">
                  <span className="d-card-t">📊 分類支出比例</span>
                </div>
                <ExpensePieChart
                  data={state.data.topCategories.map((c: any) => ({ label: c.label, amount: c.amount }))}
                />
              </div>
            </div>

            {/* ===== 📊 預算進度 ===== */}
            <BudgetBarChart
              data={state.data.budgets
                .filter((b: any) => b.limitAmount > 0)
                .map((b: any) => ({
                  label: b.categoryLabel,
                  limit: b.limitAmount,
                  spent: b.spent,
                  pct: b.limitAmount > 0 ? (b.spent / b.limitAmount) * 100 : 0,
                }))}
            />

            {/* ===== 📝 最近交易 ===== */}
            <div className="d-card">
              <div className="d-card-h">
                <span className="d-card-t">📝 最近交易</span>
              </div>
              <div className="d-tx-list">
                {state.data.recentTransactions.slice(0, 6).map((tx: any) => (
                  <TxItem
                    key={tx.id}
                    tx={tx}
                    onCopy={() => {
                      const text = `${tx.movementType === "income" ? "收入" : "支出"} ${tx.description} TWD ${tx.amount.toLocaleString()}（${tx.categoryLabel}）`;
                      navigator.clipboard.writeText(text).catch(() => {});
                    }}
                  />
                ))}
              </div>
            </div>

          </>
        </ErrorBoundary>
      ) : null}
    </div>
  );
}
