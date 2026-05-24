import type { TotalLine } from "../types";
import { formatAmount } from "../lib/format";

export function TotalList({
  emptyLabel,
  totals,
}: {
  emptyLabel: string;
  totals: TotalLine[];
}) {
  if (totals.length === 0) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <ul className="total-list">
      {totals.map((total) => (
        <li key={`${total.label}-${total.currency}`}>
          <span>{total.label}</span>
          <strong>{formatAmount(total.amount, total.currency)}</strong>
        </li>
      ))}
    </ul>
  );
}
