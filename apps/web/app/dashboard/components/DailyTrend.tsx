"use client";

import { useMemo } from "react";

export function DailyTrend({
  data,
}: {
  data: { date: string; amount: number }[];
}) {
  const maxAmount = useMemo(
    () => Math.max(...data.map((d) => d.amount), 1),
    [data],
  );

  const days = data.map((d) => ({
    ...d,
    day: d.date.slice(8),
    pct: maxAmount > 0 ? (d.amount / maxAmount) * 100 : 0,
  }));

  return (
    <section className="stat-section">
      <h3 className="stat-section-title">本月每日支出</h3>
      <div className="daily-trend-chart">
        {days.map((d) => (
          <div key={d.date} className="daily-bar-wrap" title={`${d.date}: ${d.amount}`}>
            <div
              className="daily-bar"
              style={{ height: `${d.pct}%` }}
            />
            <span className="daily-bar-day">
              {d.day}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
