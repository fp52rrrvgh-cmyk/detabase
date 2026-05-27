"use client";

import type { AccountSummary } from "../hooks/useDashboard";

export function AccountOverviewCard({
  accounts,
  totalBalance,
}: {
  accounts: AccountSummary[];
  totalBalance: number;
}) {
  if (accounts.length === 0) return null;

  return (
    <div className="d-card">
      <div className="d-card-h">
        <span className="d-card-t">🏦 帳戶餘額</span>
      </div>
      <div className="d-acct-list">
        {accounts.map((a) => (
          <div key={a.id} className="d-acct-item">
            <div className="d-acct-left">
              <div className="d-acct-icon">{acctIcon(a.accountType)}</div>
              <div className="d-acct-name">{a.displayName}</div>
            </div>
            <div className={`d-acct-amt ${a.balance >= 0 ? "positive" : "negative"}`}>
              {a.balance >= 0 ? "" : "-"}TWD {Math.abs(a.balance).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      <div className="d-acct-total">
        <span>總資產</span>
        <span className="d-acct-total-val">TWD {totalBalance.toLocaleString()}</span>
      </div>
    </div>
  );
}

function acctIcon(type: string): string {
  const icons: Record<string, string> = { cash: "💵", bank: "🏛", credit_card: "💳", stored_value: "🎫" };
  return icons[type] || "💰";
}
