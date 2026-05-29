"use client";

export function IncomeCard({
  income,
  expense,
}: {
  income: number;
  expense: number;
}) {
  const net = income - expense;
  const expensePct = income > 0 ? (expense / income) * 100 : 0;
  const isPositive = net >= 0;

  return (
    <section className="stat-section">
      <h3 className="stat-section-title">收支對比</h3>
      <div className="income-card">
        <div className="income-rows">
          <div className="income-row">
            <span className="income-label">收入</span>
            <strong className="income-amount income-amount--positive">
              TWD {income.toLocaleString()}
            </strong>
          </div>
          <div className="income-row">
            <span className="income-label">支出</span>
            <strong className="income-amount income-amount--negative">
              TWD {expense.toLocaleString()}
            </strong>
          </div>
          <div className="income-divider" />
          <div className="income-row">
            <span className="income-label">結餘</span>
            <strong
              className={`income-amount ${isPositive ? "income-amount--positive" : "income-amount--negative"}`}
            >
              {isPositive ? "+" : ""}TWD {net.toLocaleString()}
            </strong>
          </div>
        </div>

        {income > 0 && (
          <div className="income-bar-strip">
            <div className="income-bar-track">
              <div
                className="income-bar-fill income-bar-fill--expense"
                style={{ width: `${Math.min(expensePct, 100)}%` }}
              />
            </div>
            <span className="income-bar-label">
              支出佔收入 {expensePct.toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
