"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "../hooks/useAuth";
import { useDashboard } from "./hooks/useDashboard";
import { ExpensePieChart } from "./components/ExpensePieChart";
import { DailyTrendChart } from "./components/DailyTrendChart";
import { BudgetBarChart } from "./components/BudgetBarChart";
import { AccountOverviewCard } from "./components/AccountOverviewCard";
import { ShareReport } from "./components/ShareReport";

export default function DashboardPage() {
  const auth = useAuth(() => {});
  const { state, reload } = useDashboard();

  const today = new Date();
  const dayOfMonth = today.getDate();
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = monthEnd - dayOfMonth;

  return (
    <div className="db-page">
        {auth.authStatus !== "signed_in" ? (
          <p className="status-message status-muted" role="status">請先登入以查看財務戰情。</p>
        ) : state.status === "loading" ? (
          <p className="status-message" role="status">載入戰情資料中...</p>
        ) : state.status === "failure" ? (
          <p className="status-message status-error" role="alert">{state.message}</p>
        ) : state.status === "success" ? (
          <>
            {/* Page Header */}
            <div className="d-page-header">
              <div>
                <h2 className="d-page-title">戰情總覽</h2>
                <p className="d-page-desc">30 秒掌握整體財務狀態，快速判斷現況與風險</p>
              </div>
              <button className="d-refresh-btn" onClick={reload} type="button">
                ⟳ {new Date().toLocaleDateString("zh-TW")}
              </button>
            </div>

            {/* ===== KPI Row ===== */}
            <div className="d-kpi-row">
              <div className="d-kpi-card">
                <div className="d-kpi-top income" />
                <div className="d-kpi-label">本月支出</div>
                <div className="d-kpi-val amber">
                  TWD {state.data.thisMonthExpense.toLocaleString()}
                </div>
                <div className="d-kpi-sub">預算進度 —
                  {state.data.budgets.reduce((s, b) => s + b.limitAmount, 0) > 0
                    ? `${((state.data.thisMonthExpense / state.data.budgets.reduce((s, b) => s + b.limitAmount, 0)) * 100).toFixed(0)}%`
                    : "未設定"}
                </div>
              </div>
              <div className="d-kpi-card">
                <div className="d-kpi-top income" />
                <div className="d-kpi-label">本月收入</div>
                <div className="d-kpi-val income">
                  TWD {state.data.thisMonthIncome.toLocaleString()}
                </div>
                <div className="d-kpi-sub">較上月 —
                  <span className="d-change up">▲ 0%</span>
                </div>
              </div>
              <div className="d-kpi-card">
                <div className="d-kpi-top net" />
                <div className="d-kpi-label">淨流量</div>
                <div className="d-kpi-val net">
                  {state.data.thisMonthIncome - state.data.thisMonthExpense >= 0 ? "" : "-"}TWD{" "}
                  {Math.abs(state.data.thisMonthIncome - state.data.thisMonthExpense).toLocaleString()}
                </div>
                <div className="d-kpi-sub">
                  {state.data.thisMonthIncome > 0
                    ? `支出佔 ${((state.data.thisMonthExpense / state.data.thisMonthIncome) * 100).toFixed(0)}%`
                    : "僅支出"}
                </div>
              </div>
              <div className="d-kpi-card">
                <div className="d-kpi-top pending" />
                <div className="d-kpi-label">待審核</div>
                <div className="d-kpi-val pending">{state.data.pendingReviewCount}</div>
                <div className="d-kpi-sub">需處理項目</div>
              </div>
              <div className="d-kpi-card">
                <div className="d-kpi-top balance" />
                <div className="d-kpi-label">帳戶總餘額</div>
                <div className="d-kpi-val balance">
                  TWD {state.data.totalBalance.toLocaleString()}
                </div>
                <div className="d-kpi-sub">
                  <span className="d-change up">▲ {state.data.accounts.length} 帳戶</span>
                </div>
              </div>
            </div>

            {/* ===== Analytics Grid ===== */}
            <div className="d-analytics-grid">
              {/* Trend */}
              <div className="d-card">
                <div className="d-card-head">
                  <span className="d-card-title">📈 支出趨勢</span>
                </div>
                <DailyTrendChart data={state.data.dailyTrend} />
              </div>

              {/* Pie */}
              <div className="d-card">
                <div className="d-card-head">
                  <span className="d-card-title">📊 分類支出比例</span>
                </div>
                <ExpensePieChart
                  data={state.data.topCategories.map((c) => ({
                    label: c.label,
                    amount: c.amount,
                  }))}
                />
              </div>

              {/* Recent transactions */}
              <div className="d-card d-card-tall">
                <div className="d-card-head">
                  <span className="d-card-title">📝 最近交易</span>
                  <a href="/quick-capture" className="d-card-more">查看全部 ›</a>
                </div>
                <div className="d-tx-list">
                  {state.data.recentTransactions.slice(0, 6).map((tx) => (
                    <div key={tx.id} className="d-tx-item">
                      <div className="d-tx-left">
                        <span className={`d-tx-icon ${tx.movementType === "income" ? "icon-income" : "icon-expense"}`}>
                          {tx.movementType === "income" ? "↓" : "↑"}
                        </span>
                        <div>
                          <div className="d-tx-desc">{tx.description}</div>
                          <div className="d-tx-cat">{tx.categoryLabel}</div>
                        </div>
                      </div>
                      <div className={`d-tx-amt ${tx.movementType === "income" ? "income" : "expense"}`}>
                        {tx.movementType === "income" ? "+" : "-"}TWD {tx.amount.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ===== Bottom Row ===== */}
            <div className="d-bottom-grid">
              {/* Accounts */}
              <AccountOverviewCard
                accounts={state.data.accounts}
                totalBalance={state.data.totalBalance}
              />

              {/* Budget */}
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

              {/* Summary Footer */}
              <div className="d-card d-summary-card">
                <div className="d-card-head">
                  <span className="d-card-title">📋 今日摘要</span>
                </div>
                <div className="d-summary-rows">
                  <div className="d-summary-row">
                    <span className="d-summary-label">今日支出</span>
                    <span className="d-summary-val expense">
                      TWD {state.data.todayExpense.toLocaleString()}
                    </span>
                  </div>
                  <div className="d-summary-row">
                    <span className="d-summary-label">今日收入</span>
                    <span className="d-summary-val income">
                      TWD {state.data.todayIncome.toLocaleString()}
                    </span>
                  </div>
                  <div className="d-summary-row">
                    <span className="d-summary-label">今日淨流量</span>
                    <span className={`d-summary-val ${state.data.todayIncome - state.data.todayExpense >= 0 ? "income" : "expense"}`}>
                      {state.data.todayIncome - state.data.todayExpense >= 0 ? "" : "-"}TWD{" "}
                      {Math.abs(state.data.todayIncome - state.data.todayExpense).toLocaleString()}
                    </span>
                  </div>
                </div>
                <hr className="d-summary-divider" />
                <div className="d-summary-rows">
                  <div className="d-summary-row">
                    <span className="d-summary-label">本月累計支出</span>
                    <span className="d-summary-val expense">
                      TWD {state.data.thisMonthExpense.toLocaleString()}
                    </span>
                  </div>
                  <div className="d-summary-row">
                    <span className="d-summary-label">本月累計收入</span>
                    <span className="d-summary-val income">
                      TWD {state.data.thisMonthIncome.toLocaleString()}
                    </span>
                  </div>
                  <div className="d-summary-row d-summary-total">
                    <span className="d-summary-label">預估月底淨流量</span>
                    <span className="d-summary-val">
                      TWD {((state.data.thisMonthIncome / Math.max(dayOfMonth, 1) * monthEnd) - (state.data.thisMonthExpense / Math.max(dayOfMonth, 1) * monthEnd)).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Share */}
            <ShareReport
              expense={state.data.thisMonthExpense}
              income={state.data.thisMonthIncome}
              topCategories={state.data.topCategories}
              budgets={state.data.budgets}
              accounts={state.data.accounts}
              totalBalance={state.data.totalBalance}
            />
          </>
        ) : null}
      </div>
  );
}
