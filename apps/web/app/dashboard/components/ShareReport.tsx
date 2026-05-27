"use client";

import { useState } from "react";

function formatAmount(n: number): string {
  return `TWD ${n.toLocaleString()}`;
}

export function ShareReport({
  expense,
  income,
  topCategories,
  budgets,
  accounts,
  totalBalance,
}: {
  expense: number;
  income: number;
  topCategories: { label: string; amount: number }[];
  budgets: { categoryLabel: string; limitAmount: number; spent: number }[];
  accounts?: { displayName: string; balance: number }[];
  totalBalance?: number;
}) {
  const [copied, setCopied] = useState(false);
  const now = new Date();
  const monthLabel = `${now.getFullYear()}年${now.getMonth() + 1}月`;

  function buildReport(): string {
    const net = income - expense;
    const lines: string[] = [];

    lines.push(`📊 ${monthLabel} 財務總結`);
    lines.push(`─────────────────`);
    lines.push(`收入：${formatAmount(income)}`);
    lines.push(`支出：${formatAmount(expense)}`);
    lines.push(`結餘：${formatAmount(net)}`);
    if (income > 0) {
      lines.push(`支出佔收入 ${((expense / income) * 100).toFixed(0)}%`);
    }

    if (budgets.length > 0) {
      lines.push(``);
      lines.push(`📋 預算執行：`);
      for (const b of budgets) {
        const pct =
          b.limitAmount > 0
            ? Math.min((b.spent / b.limitAmount) * 100, 100).toFixed(0)
            : "0";
        const remaining = b.limitAmount - b.spent;
        lines.push(
          `  ${b.categoryLabel}：${formatAmount(b.spent)} / ${formatAmount(b.limitAmount)}（${pct}%），剩 ${formatAmount(Math.max(remaining, 0))}`,
        );
      }
    }

    if (topCategories.length > 0) {
      lines.push(``);
      lines.push(`🏆 本月花最多：`);
      for (const c of topCategories) {
        lines.push(`  ${c.label}：${formatAmount(c.amount)}`);
      }
    }

    if (accounts && accounts.length > 0 && totalBalance !== undefined) {
      lines.push(``);
      lines.push(`🏦 帳戶總覽：`);
      for (const a of accounts) {
        lines.push(`  ${a.displayName}：${formatAmount(a.balance)}`);
      }
      lines.push(`  合計：${formatAmount(totalBalance)}`);
    }

    lines.push(``);
    lines.push(`🔗 ${window.location.origin}/dashboard`);

    return lines.join("\n");
  }

  function handleExportCSV() {
    const rows: string[][] = [["分類", "金額", "幣別"]];
    for (const c of topCategories) {
      rows.push([c.label, String(c.amount), "TWD"]);
    }
    if (budgets.length > 0) {
      rows.push([]);
      rows.push(["預算分類", "已花費", "預算上限", "使用率"]);
      for (const b of budgets) {
        const pct = b.limitAmount > 0 ? ((b.spent / b.limitAmount) * 100).toFixed(0) + "%" : "-";
        rows.push([b.categoryLabel, String(b.spent), String(b.limitAmount), pct]);
      }
    }
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${monthLabel.replace(/[\/\s]/g, "_")}_財務報表.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    const text = buildReport();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="d-share-card">
        <p className="d-share-hint">
          一鍵複製本月財務總結，可直接貼到 Telegram 或備忘錄
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="submit-button" onClick={handleShare} type="button">
            {copied ? "✅ 已複製！" : "📋 複製本月總結"}
          </button>
          <button className="secondary-button d-desktop-only" onClick={handleExportCSV} type="button">
            📥 下載 CSV 月報
          </button>
        </div>
      </div>
  );
}
