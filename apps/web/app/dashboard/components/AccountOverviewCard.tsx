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

  // Calculate available funds and net worth
  // Credit card balances count as negative (unpaid)
  // Loans count as negative
  const creditCardUnpaid = accounts
    .filter((a) => a.accountType === "credit_card")
    .reduce((s, a) => s + Math.abs(a.balance), 0);
  const loanTotal = accounts
    .filter((a) => a.accountType === "stored_value")
    .reduce((s, a) => s + Math.abs(a.totalLoan ?? 0), 0);
  const availableFunds = accounts
    .filter((a) => a.accountType !== "credit_card" && a.accountType !== "stored_value")
    .reduce((s, a) => s + a.balance, 0) - creditCardUnpaid;
  const netWorth = availableFunds - loanTotal;

  return (
    <div className="d-card">
      <div className="d-card-h">
        <span className="d-card-t">🏦 帳戶概覽</span>
      </div>

      {/* Summary metrics */}
      <div className="acct-summary-row">
        <div className="acct-summary-item">
          <span className="acct-summary-label">可用資金</span>
          <span className={`acct-summary-value ${availableFunds >= 0 ? "text-green" : "text-red"}`}>
            TWD {availableFunds.toLocaleString()}
          </span>
        </div>
        <div className="acct-summary-item">
          <span className="acct-summary-label">淨資產</span>
          <span className={`acct-summary-value ${netWorth >= 0 ? "text-green" : "text-red"}`}>
            TWD {netWorth.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Account cards */}
      <div className="acct-cards">
        {accounts.map((a) => {
          const isCredit = a.accountType === "credit_card";
          const isLoan = a.accountType === "stored_value";
          const displayBalance = isCredit ? Math.abs(a.balance) : a.balance;
          return (
            <div key={a.id} className={`acct-card ${isCredit ? "acct-card-credit" : ""} ${isLoan ? "acct-card-loan" : ""}`}>
              <div className="acct-card-header">
                <span className="acct-card-icon">{acctIcon(a.accountType)}</span>
                <span className="acct-card-name">{a.displayName}</span>
                <span className="acct-card-type-badge">{acctTypeLabel(a.accountType)}</span>
              </div>
              <div className={`acct-card-balance ${isCredit || isLoan ? "text-red" : "text-green"}`}>
                {isCredit || isLoan ? "-" : ""}TWD {displayBalance.toLocaleString()}
              </div>
              {isCredit && a.creditLimit != null && (
                <div className="acct-card-meta">
                  額度 TWD {a.creditLimit.toLocaleString()}
                  <span className="acct-card-used">
                    已用 {Math.round((displayBalance / a.creditLimit) * 100)}%
                  </span>
                </div>
              )}
              {isLoan && a.totalLoan != null && (
                <div className="acct-card-meta">
                  總貸款 TWD {a.totalLoan.toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total balance */}
      {accounts.length > 1 && (
        <div className="d-acct-total">
          <span>帳戶餘額總計</span>
          <span className={`d-acct-total-val ${totalBalance >= 0 ? "text-green" : "text-red"}`}>
            TWD {totalBalance.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

function acctIcon(type: string): string {
  const icons: Record<string, string> = { cash: "💵", bank: "🏛", credit_card: "💳", stored_value: "🎫" };
  return icons[type] || "💰";
}

function acctTypeLabel(type: string): string {
  const labels: Record<string, string> = { cash: "現金", bank: "銀行", credit_card: "信用卡", stored_value: "貸款" };
  return labels[type] || type;
}
