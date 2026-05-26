"use client";

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString()}`;
}

export function StatCard({
  label,
  amount,
  currency,
  subtitle,
}: {
  label: string;
  amount: number | null;
  currency: string;
  subtitle?: string;
}) {
  return (
    <article className="stat-card">
      <span className="stat-card-label">{label}</span>
      {amount !== null ? (
        <strong className="stat-card-value">
          {formatAmount(amount, currency)}
        </strong>
      ) : (
        <p className="status-message status-muted">資料不足</p>
      )}
      {subtitle ? <p className="stat-card-subtitle">{subtitle}</p> : null}
    </article>
  );
}
