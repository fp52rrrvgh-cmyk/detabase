"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "../hooks/useAuth";
import { useDashboard } from "./hooks/useDashboard";
import { StatCard } from "./components/StatCard";
import { TopCategories } from "./components/TopCategories";
import { DailyTrend } from "./components/DailyTrend";
import { BudgetProgress } from "./components/BudgetProgress";
import { Briefing } from "./components/Briefing";
import { IncomeCard } from "./components/IncomeCard";

export default function DashboardPage() {
  const auth = useAuth(() => {});
  const { state, reload } = useDashboard();

  return (
    <main className="dashboard-shell">
      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <p className="eyebrow">戰情中心</p>
          <h1>財務總覽</h1>
          <p className="summary">即時支出快照，掌握本月資金流向</p>
        </div>

        <div className="dashboard-actions">
          <button
            className="secondary-button dashboard-refresh"
            disabled={state.status === "loading"}
            onClick={reload}
            type="button"
          >
            {state.status === "loading" ? "讀取中..." : "重新整理"}
          </button>
        </div>
      </div>

      {auth.authStatus !== "signed_in" ? (
        <p className="status-message status-muted" role="status">
          請先登入以查看財務戰情。
        </p>
      ) : state.status === "loading" ? (
        <p className="status-message" role="status">
          載入戰情資料中...
        </p>
      ) : state.status === "failure" ? (
        <p className="status-message status-error" role="alert">
          {state.message}
        </p>
      ) : state.status === "success" ? (
        <>
          <Briefing text={state.data.briefing} />

          <div className="stat-card-strip">
            <StatCard
              label="今日支出"
              amount={state.data.todayExpense}
              currency="TWD"
              subtitle="即時統計"
            />
            <StatCard
              label="本月支出"
              amount={state.data.thisMonthExpense}
              currency="TWD"
              subtitle="本月累計"
            />
            <StatCard
              label="近 7 日支出"
              amount={state.data.last7DaysExpense}
              currency="TWD"
              subtitle="近一週"
            />
          </div>

          <TopCategories categories={state.data.topCategories} />
          <IncomeCard income={state.data.thisMonthIncome} expense={state.data.thisMonthExpense} />
          <BudgetProgress budgets={state.data.budgets} />
          <DailyTrend data={state.data.dailyTrend} />
        </>
      ) : null}
    </main>
  );
}
