"use client";

import type { AccountSummary } from "../hooks/useDashboard";

export type AccountOverviewProps = {
  accounts: AccountSummary[];
  totalBalance: number;
};

export function AccountOverview({ accounts, totalBalance }: AccountOverviewProps) {
  if (accounts.length === 0) return null;

  return (
    <div className="account-overview-block" aria-label="帳戶總覽">
      <div className="section-heading">
        <h2>帳戶總覽</h2>
        <span className="total-balance">
          總資產 TWD {totalBalance.toLocaleString()}
        </span>
      </div>

      <div className="account-grid">
        {accounts.map((account) => (
          <div key={account.id} className="account-card">
            <div className="account-card-header">
              <span className="account-type-badge">{accountTypeLabel(account.accountType)}</span>
              {account.isCoinBox && <span className="account-coin-badge">🪙 零錢盒</span>}
              <span className="account-name">{account.displayName}</span>
            </div>
            <div className="account-balance">
              <span className={`balance-value ${account.balance >= 0 ? "balance-positive" : "balance-negative"}`}>
                TWD {account.balance.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function accountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    cash: "現金",
    bank: "銀行",
    credit_card: "信用卡",
    stored_value: "儲值",
    digital_account: "數位帳戶",
    other: "其他",
  };
  return labels[type] ?? type;
}
