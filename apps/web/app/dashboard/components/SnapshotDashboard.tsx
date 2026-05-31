"use client";

import type { ReactNode } from "react";

interface CreditCardInfo {
  displayName: string;
  used: number;
  creditLimit: number | null;
}

interface SnapshotDashboardProps {
  cashOnHand: number;
  availableCash: number;
  coinBoxBalance: number;
  creditCards: CreditCardInfo[];
  totalDebt: number;
  monthlyNet: number;
}

function formatTWD(value: number): string {
  return `NT$ ${Math.round(value).toLocaleString()}`;
}

function SnapshotRow({
  label,
  value,
  valueClassName = "",
  rowClassName = "",
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  rowClassName?: string;
}) {
  return (
    <div className={`snapshot-row ${rowClassName}`}>
      <span className="snapshot-label">{label}</span>
      <span className={`snapshot-value ${valueClassName}`}>{value}</span>
    </div>
  );
}

export function SnapshotDashboard({
  cashOnHand,
  availableCash,
  coinBoxBalance,
  creditCards,
  totalDebt,
  monthlyNet,
}: SnapshotDashboardProps) {
  const creditTotalUsed = creditCards.reduce((sum, card) => sum + card.used, 0);
  const creditTotalLimit = creditCards.reduce((sum, card) => sum + (card.creditLimit ?? 0), 0);
  const creditPct = creditTotalLimit > 0 ? (creditTotalUsed / creditTotalLimit) * 100 : 0;
  const hasCreditWarning = creditTotalLimit > 0 && creditPct >= 80;
  const netClass = monthlyNet >= 0 ? "snapshot-positive" : "snapshot-negative";
  const debtClass = totalDebt > 0 ? "snapshot-debt" : "";

  return (
    <section className="snapshot-card" aria-label="資產負債快照">
      <SnapshotRow label="💰 手邊現金" value={formatTWD(cashOnHand)} />
      {coinBoxBalance > 0 && (
        <SnapshotRow
          label="🪙 零錢盒"
          value={formatTWD(coinBoxBalance)}
          rowClassName="snapshot-sub"
        />
      )}
      <SnapshotRow label="🏦 可用現金" value={formatTWD(availableCash)} />
      {creditCards.length > 0 && (
        <SnapshotRow
          label="💳 信用卡已用"
          value={(
            <>
              {formatTWD(creditTotalUsed)}
              <span className="snapshot-value-sub">
                {" / "}
                {creditTotalLimit > 0 ? creditTotalLimit.toLocaleString() : "—"}
              </span>
              {hasCreditWarning && <span className="snapshot-warn"> ⚠️</span>}
            </>
          )}
        />
      )}

      <SnapshotRow
        label="📉 負債總額"
        value={formatTWD(totalDebt)}
        valueClassName={debtClass}
      />

      <SnapshotRow
        label="📊 本月淨值"
        value={`${monthlyNet >= 0 ? "" : "-"}${formatTWD(Math.abs(monthlyNet))}`}
        valueClassName={netClass}
      />
    </section>
  );
}
