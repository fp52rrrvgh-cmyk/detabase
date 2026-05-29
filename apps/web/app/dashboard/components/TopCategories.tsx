"use client";

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString()}`;
}

export function TopCategories({
  categories,
}: {
  categories: { label: string; amount: number; currency: string }[];
}) {
  if (categories.length === 0) {
    return (
      <section className="stat-section">
        <h3 className="stat-section-title">本月分類排行</h3>
        <p className="status-message status-muted">本月無分類支出</p>
      </section>
    );
  }

  const maxAmount = Math.max(...categories.map((c) => c.amount));
  const maxBar = maxAmount > 0 ? maxAmount : 1;

  return (
    <section className="stat-section">
      <h3 className="stat-section-title">本月分類排行</h3>
      <div className="category-bar-list">
        {categories.map((cat) => (
          <div key={cat.label} className="category-bar-row">
            <div className="category-bar-header">
              <span className="category-bar-label">{cat.label}</span>
              <strong className="category-bar-amount">
                {formatAmount(cat.amount, cat.currency)}
              </strong>
            </div>
            <div className="category-bar-track">
              <div
                className="category-bar-fill"
                style={{ width: `${(cat.amount / maxBar) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
