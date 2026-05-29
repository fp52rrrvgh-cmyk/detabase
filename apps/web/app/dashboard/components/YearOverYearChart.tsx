"use client";

import { useMemo } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

function formatTWD(n: number): string {
  return `TWD ${Math.round(n).toLocaleString()}`;
}

export function YearOverYearChart({
  currentYear,
  currentMonth,
  monthlyHistory,
}: {
  currentYear: number;
  currentMonth: number;
  monthlyHistory: { year: number; month: number; expense: number; income: number }[];
}) {
  // Group by month (aggregate across years)
  const byMonth = useMemo(() => {
    const map = new Map<string, { month: number; expenses: number[]; incomes: number[] }>();
    for (const h of monthlyHistory) {
      const key = String(h.month);
      if (!map.has(key)) map.set(key, { month: h.month, expenses: [], incomes: [] });
      const entry = map.get(key)!;
      entry.expenses.push(h.expense);
      entry.incomes.push(h.income);
    }
    // Sort by month
    return Array.from(map.values()).sort((a, b) => a.month - b.month);
  }, [monthlyHistory]);

  if (byMonth.length === 0) return null;

  const chartData = byMonth
    .filter((m) => m.month <= currentMonth) // Only show up to current month
    .map((m) => ({
      month: `${m.month}月`,
      支出: Math.round(m.expenses.reduce((s, e) => s + e, 0) / Math.max(m.expenses.length, 1)),
    }));

  const maxVal = Math.max(...chartData.map((d) => d.支出), 1);

  return (
    <div className="d-card d-desktop-only">
      <div className="d-card-h">
        <span className="d-card-t">📈 去年同期支出對比</span>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="month" tick={{ fill: "#475569", fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis
            tick={{ fill: "#475569", fontSize: 9 }}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: any) => formatTWD(Number(value))}
            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.75rem" }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Bar dataKey="支出" fill="#2dd4bf" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
      <p className="d-yoy-note">
        近 {monthlyHistory.length} 個月支出平均 TWD {Math.round(monthlyHistory.reduce((s, h) => s + h.expense, 0) / Math.max(monthlyHistory.length, 1)).toLocaleString()}
      </p>
    </div>
  );
}
