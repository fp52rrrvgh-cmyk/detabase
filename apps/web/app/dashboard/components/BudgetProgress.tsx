"use client";

function formatAmount(amount: number): string {
  return `TWD ${amount.toLocaleString()}`;
}

export function BudgetProgress({
  budgets,
}: {
  budgets: {
    categoryId: string;
    categoryLabel: string;
    limitAmount: number;
    spent: number;
    currency: string;
  }[];
}) {
  if (budgets.length === 0) {
    return (
      <section className="stat-section">
        <h3 className="stat-section-title">預算戰情</h3>
        <p className="status-message status-muted">本月尚未設定預算</p>
      </section>
    );
  }

  return (
    <section className="stat-section">
      <h3 className="stat-section-title">預算戰情</h3>
      <div className="budget-progress-list">
        {budgets.map((b) => {
          const pct = b.limitAmount > 0 ? Math.min((b.spent / b.limitAmount) * 100, 100) : 0;
          const remaining = Math.max(b.limitAmount - b.spent, 0);
          const isOver = b.spent > b.limitAmount;
          const isWarning = !isOver && pct >= 80;

          return (
            <div key={b.categoryId} className="budget-progress-card">
              <div className="budget-progress-header">
                <span className="budget-progress-label">{b.categoryLabel}</span>
                <span className={`budget-progress-status ${isOver ? "status-over" : isWarning ? "status-warning" : "status-ok"}`}>
                  {isOver ? "超支" : isWarning ? "警戒" : "正常"}
                </span>
              </div>
              <div className="budget-progress-track">
                <div
                  className={`budget-progress-fill ${isOver ? "fill-over" : isWarning ? "fill-warning" : ""}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="budget-progress-details">
                <span>已花 {formatAmount(b.spent)}</span>
                <span>上限 {formatAmount(b.limitAmount)}</span>
              </div>
              <div className="budget-progress-remaining">
                剩餘 <strong>{formatAmount(remaining)}</strong>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
