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
}: {
  expense: number;
  income: number;
  topCategories: { label: string; amount: number }[];
  budgets: { categoryLabel: string; limitAmount: number; spent: number }[];
}) {
  const [copied, setCopied] = useState(false);

  function buildReport(): string {
    const now = new Date();
    const month = `${now.getFullYear()}年${now.getMonth() + 1}月`;
    const net = income - expense;
    const lines: string[] = [];

    lines.push(`📊 ${month} 財務總結`);
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

    lines.push(``);
    lines.push(`🔗 ${window.location.origin}/dashboard`);

    return lines.join("\n");
  }

  async function handleShare() {
    const text = buildReport();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback: select text method
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
    <section className="stat-section">
      <div className="share-report-card">
        <p className="share-report-hint">
          一鍵複製本月財務總結，可直接貼到 Telegram 或備忘錄
        </p>
        <button className="submit-button" onClick={handleShare} type="button">
          {copied ? "✅ 已複製！" : "📋 複製本月總結"}
        </button>
      </div>
    </section>
  );
}
