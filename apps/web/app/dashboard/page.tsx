"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "../hooks/useAuth";
import { runtimeConfig } from "../constants";
import { useDashboard } from "./hooks/useDashboard";
import { ExpensePieChart } from "./components/ExpensePieChart";
import { DailyTrendChart } from "./components/DailyTrendChart";
import { BudgetBarChart } from "./components/BudgetBarChart";
import { DailySpendingGauge } from "./components/DailySpendingGauge";
import { AccountOverviewCard } from "./components/AccountOverviewCard";
import { Briefing } from "./components/Briefing";
import { SnapshotDashboard } from "./components/SnapshotDashboard";
import { ShareReport } from "./components/ShareReport";
import { YearOverYearChart } from "./components/YearOverYearChart";
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
          <button className="d-tx-action-btn" onClick={(e) => { e.stopPropagation(); onCopy(); setShowActions(false); }} type="button">
            📋 複製
          </button>
          <button className="d-tx-action-btn" onClick={(e) => { e.stopPropagation(); setShowActions(false); }} type="button">
            🔗 到 Telegram 修改
          </button>
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

  // Auto-reload on login: when authStatus changes to signed_in, refresh data
  useEffect(() => {
    if (auth.authStatus === "signed_in") {
      reload();
    }
  }, [auth.authStatus, reload]);
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const today = new Date();
  const dayOfMonth = today.getDate();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysInViewMonth = new Date(viewYear, viewMonth, 0).getDate();

  const totalBudget = state.status === "success"
    ? state.data.budgets.reduce((s, b) => s + b.limitAmount, 0)
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
            {/* ===== Header with month nav ===== */}
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
              <button className="d-refresh-btn" onClick={reload} type="button">
                ⟳
              </button>
            </div>
          </div>

          <h3 className="d-section-title">⚔️ Today War Room</h3>
          {/* ===== Daily Spending Gauge ===== */}
          {isCurrentMonth ? (
            <DailySpendingGauge
              spent={state.data.todayExpense}
              limit={state.data.dailyLimit.amount}
              type={state.data.dailyLimit.type}
              isCurrentMonth={isCurrentMonth}
              onSetLimit={async (amount) => {
                if (!supabase) throw new Error("Supabase client is not configured");
                const { error } = await supabase
                  .from("finance_daily_spending_limits")
                  .upsert({ daily_limit_amount: amount }, { onConflict: "user_id" });
                if (error) throw error;
                reload();
              }}
              onResetToAuto={async () => {
                if (!supabase) throw new Error("Supabase client is not configured");
                const { error } = await supabase
                  .from("finance_daily_spending_limits")
                  .delete();
                if (error) throw error;
                reload();
              }}
            />
          ) : (
            <div className="d-card d-summary-card">
              <div className="d-card-h"><span className="d-card-t">📅 {viewMonth}月概覽</span></div>
              <div className="d-summary-rows">
                <div className="d-s-row">
                  <span>日均支出</span>
                  <span className="danger">{formatTWD(Math.round(state.data.thisMonthExpense / daysInViewMonth))}</span>
                </div>
                <div className="d-s-row">
                  <span>總支出</span>
                  <span className="danger">{formatTWD(state.data.thisMonthExpense)}</span>
                </div>
                <div className="d-s-row">
                  <span>總收入</span>
                  <span className="income">{formatTWD(state.data.thisMonthIncome)}</span>
                </div>
              </div>
            </div>
          )}

          {/* ===== Briefing (current month only) ===== */}
          {isCurrentMonth && <Briefing text={state.data.briefing} />}

          <h3 className="d-section-title">💰 財務狀態</h3>

          {/* ===== 財務狀態 ===== */}
          {/* ===== Snapshot: Asset-Liability Dashboard ===== */}
          <SnapshotDashboard
            cashOnHand={state.data.cashOnHand}
            availableCash={state.data.availableCash}
            coinBoxBalance={state.data.coinBoxBalance}
            creditCards={state.data.creditCards}
            totalDebt={state.data.totalDebt}
            monthlyNet={state.data.thisMonthIncome - state.data.thisMonthExpense}
          />

          {/* ===== KPI Row (5 cards) ===== */}
          <div className="d-kpi-row">
            <div className="d-kpi">
              <div className="d-kpi-glow expense" />
              <div className="d-kpi-lbl">{isCurrentMonth ? "本月" : `${viewMonth}月`}支出</div>
              <div className="d-kpi-val expense">{formatTWD(state.data.thisMonthExpense)}</div>
              <div className="d-kpi-sub">
                {totalBudget > 0 ? `預算 ${((state.data.thisMonthExpense / totalBudget) * 100).toFixed(0)}%` : "無預算"}
              </div>
            </div>
            <div className="d-kpi">
              <div className="d-kpi-glow income" />
              <div className="d-kpi-lbl">{isCurrentMonth ? "本月" : `${viewMonth}月`}收入</div>
              <div className="d-kpi-val income">{formatTWD(state.data.thisMonthIncome)}</div>
              <div className="d-kpi-sub"></div>
            </div>
            <div className="d-kpi">
              <div className="d-kpi-glow net" />
              <div className="d-kpi-lbl">淨流量</div>
              <div className={`d-kpi-val net ${state.data.thisMonthIncome - state.data.thisMonthExpense >= 0 ? "positive" : "negative"}`}>
                {(state.data.thisMonthIncome - state.data.thisMonthExpense) >= 0 ? "" : "-"}
                {formatTWD(Math.abs(state.data.thisMonthIncome - state.data.thisMonthExpense))}
              </div>
              <div className="d-kpi-sub">
                {state.data.thisMonthIncome > 0
                  ? `支出佔 ${((state.data.thisMonthExpense / state.data.thisMonthIncome) * 100).toFixed(0)}%`
                  : "僅支出"}
              </div>
            </div>
            <div className="d-kpi">
              <div className="d-kpi-glow budget" />
              <div className="d-kpi-lbl">總預算</div>
              <div className="d-kpi-val budget-val">{formatTWD(totalBudget)}</div>
              <div className="d-kpi-sub">{state.data.budgets.length} 分類</div>
            </div>
            <div className="d-kpi">
              <div className="d-kpi-glow balance" />
              <div className="d-kpi-lbl">帳戶總餘額</div>
              <div className="d-kpi-val balance-val">{formatTWD(state.data.totalBalance)}</div>
              <div className="d-kpi-sub">▲ {state.data.accounts.length} 帳戶</div>
            </div>
          </div>

          {/* ===== 帳戶概覽 ===== */}
          <AccountOverviewCard
            accounts={state.data.accounts}
            totalBalance={state.data.totalBalance}
          />

          {/* ===== 債務追蹤連結（移至 /debts 完整管理） ===== */}
          <a href="/debts" className="debt-tracker-link">
            <span>💳 債務追蹤</span>
            <span>管理 ›</span>
          </a>

          {/* ===== 花費分析 ===== */}
          <h3 className="d-section-title">📊 花費分析</h3>
          <div className="d-mid-grid">
            <div className="d-card">
              <div className="d-card-h">
                <span className="d-card-t">📈 支出趨勢</span>
              </div>
              <DailyTrendChart data={state.data.dailyTrend} />
            </div>
            <div className="d-card">
              <div className="d-card-h">
                <span className="d-card-t">📊 分類支出比例</span>
              </div>
              <ExpensePieChart
                data={state.data.topCategories.map((c) => ({ label: c.label, amount: c.amount }))}
              />
            </div>
          </div>

          {/* ===== Recent Transactions ===== */}
          <div className="d-card">
            <div className="d-card-h">
              <span className="d-card-t">📝 最近交易</span>
            </div>
            <div className="d-tx-list">
              {state.data.recentTransactions.slice(0, 6).map((tx) => (
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

          {/* ===== 決策支援 ===== */}
          <h3 className="d-section-title">🎯 決策支援</h3>
          {/* Budget bar */}
          <BudgetBarChart
            data={state.data.budgets
              .filter((b) => b.limitAmount > 0)
              .map((b) => ({
                label: b.categoryLabel,
                limit: b.limitAmount,
                spent: b.spent,
                pct: b.limitAmount > 0 ? (b.spent / b.limitAmount) * 100 : 0,
              }))}
          />

          {/* Upcoming subscriptions (current month only) */}
          {isCurrentMonth && (
          <div className="d-card d-desktop-only">
            <div className="d-card-h">
              <span className="d-card-t">🔄 即將扣款</span>
              <a href="/settings" className="d-card-m">管理 ›</a>
            </div>
            <div className="d-tx-list">
              {state.data.upcomingSubscriptions.length === 0 ? (
                <p className="status-message status-muted" style={{ padding: "12px 0" }}>近 30 天無訂閱</p>
              ) : (
                state.data.upcomingSubscriptions.slice(0, 5).map((sub) => (
                  <div key={sub.id} className="d-tx-item">
                    <div className="d-tx-left">
                      <span className="d-tx-icon subscription">
                        {sub.frequency === "weekly" ? "W" : sub.frequency === "monthly" ? "M" : "Y"}
                      </span>
                      <div>
                        <div className="d-tx-desc">{sub.description}</div>
                        <div className="d-tx-cat">{sub.categoryLabel} · {sub.nextDate}</div>
                      </div>
                    </div>
                    <div className={`d-tx-amt ${sub.movementType === "income" ? "income" : "expense"}`}>
                      {sub.movementType === "income" ? "+" : "-"}TWD {sub.amount.toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          )}

          {/* Prediction panel (current month only) */}
          {isCurrentMonth && (
          <div className="d-card">
            <div className="d-card-h">
              <span className="d-card-t">🔮 月底預測</span>
            </div>
            <div className="d-pred-grid">
              {(() => {
                const curExpense = state.data.thisMonthExpense;
                const curIncome = state.data.thisMonthIncome;
                const dd = isCurrentMonth ? dayOfMonth : monthEnd;
                const dl = monthEnd - dd;
                const avgDailyExpense = dd > 0 ? curExpense / dd : 0;
                const projectedExpense = curExpense + avgDailyExpense * dl;
                const subTotal = state.data.upcomingSubscriptions
                  .filter((s) => s.movementType === "expense")
                  .reduce((s, x) => s + x.amount, 0);
                const histAvg = state.data.monthlyHistory.length > 0
                  ? state.data.monthlyHistory.reduce((s, h) => s + h.expense, 0) / state.data.monthlyHistory.length
                  : 0;

                return (
                  <>
                    <div className="d-pred-item">
                      <span className="d-pred-label">月底推估支出</span>
                      <span className="d-pred-item-val expense">{formatTWD(projectedExpense)}</span>
                    </div>
                    <div className="d-pred-item">
                      <span className="d-pred-label">歷史月均支出</span>
                      <span className="d-pred-item-val expense">{formatTWD(histAvg)}</span>
                    </div>
                    <div className="d-pred-item">
                      <span className="d-pred-label">即將扣款 (近30天)</span>
                      <span className="d-pred-item-val expense">{formatTWD(subTotal)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
          )}

          {/* Desktop-only: full budget overview */}
          <div className="d-desktop-section">

            <div className="d-card">
              <div className="d-card-h">
                <span className="d-card-t">📊 近 6 月收支趨勢</span>
              </div>
              <div className="d-hist-chart">
                {state.data.monthlyHistory.slice().reverse().map((h) => {
                  const maxVal = Math.max(h.expense, h.income, 1);
                  return (
                    <div key={`${h.year}-${h.month}`} className="d-hist-bar-group">
                      <div className="d-hist-labels">
                        <span className="d-hist-month">{h.month}月</span>
                        <span className="d-hist-year">{h.year}</span>
                      </div>
                      <div className="d-hist-bars">
                        <div className="d-hist-bar-wrapper">
                          <div
                            className="d-hist-bar income"
                            style={{ height: `${(h.income / maxVal) * 100}%` }}
                            title={`收入 ${h.income}`}
                          />
                        </div>
                        <div className="d-hist-bar-wrapper">
                          <div
                            className="d-hist-bar expense"
                            style={{ height: `${(h.expense / maxVal) * 100}%` }}
                            title={`支出 ${h.expense}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category deep analysis */}
            <div className="d-card">
              <div className="d-card-h">
                <span className="d-card-t">📂 分類深度分析</span>
              </div>
              <div className="d-cat-deep-list">
                {state.data.topCategoriesFull
                  .sort((a: any, b: any) => b.amount - a.amount)
                  .slice(0, 5)
                  .map((cat: any, idx) => (
                    <div key={cat.categoryId || idx} className="d-cat-deep-row">
                      <div className="d-cat-deep-rank">#{idx + 1}</div>
                      <div>
                        <div className="d-cat-deep-name">{cat.label}</div>
                        <div className="d-cat-deep-grp">{cat.groupingPurpose || ""}</div>
                      </div>
                      <div className="d-cat-deep-stats">
                        <div className="d-cat-deep-amt">{formatTWD(cat.amount)}</div>
                        <div className="d-cat-deep-pct">{cat.pct}%</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          <YearOverYearChart
            currentYear={viewYear}
            currentMonth={viewMonth}
            monthlyHistory={state.data.monthlyHistory}
          />

          {/* ===== Footer Summary ===== */}{/* Share */}
          <ShareReport
            expense={state.data.thisMonthExpense}
            income={state.data.thisMonthIncome}
            topCategories={state.data.topCategories}
            budgets={state.data.budgets}
            accounts={state.data.accounts}
            totalBalance={state.data.totalBalance}
          />
        </>
      </ErrorBoundary>
    ) : null}
    </div>
  );
}
