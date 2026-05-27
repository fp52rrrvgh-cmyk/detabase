"use client";

export type BudgetChartData = {
  label: string;
  limit: number;
  spent: number;
  pct: number;
};

export function BudgetBarChart({ data }: { data: BudgetChartData[] }) {
  if (data.length === 0) return null;

  return (
    <div className="d-card">
      <div className="d-card-h">
        <span className="d-card-t">🎯 預算進度</span>
        <a href="/budgets" className="d-card-m">查看所有 ›</a>
      </div>
      <div className="d-budget-list">
        {data.slice(0, 5).map((b) => {
          const pct = Math.min(b.pct, 100);
          const status = b.pct >= 100 ? "over" : b.pct >= 80 ? "warn" : "ok";
          return (
            <div key={b.label} className="d-budget-item">
              <div className="d-budget-h">
                <span className="d-budget-name">{b.label}</span>
                <span className={`d-budget-pct ${status}`}>{b.pct.toFixed(0)}%</span>
              </div>
              <div className="d-budget-track">
                <div className={`d-budget-fill ${status}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="d-budget-detail">
                TWD {b.spent.toLocaleString()} / {b.limit.toLocaleString()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
