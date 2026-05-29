"use client";

import { useState, useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export type PieData = { label: string; amount: number };

const COLORS = ["#2dd4bf", "#fbbf24", "#a78bfa", "#fb7185", "#38bdf8", "#f97316", "#34d399", "#e879f9", "#fb923c", "#22d3ee"];

function formatTWD(n: number): string {
  return `TWD ${Math.round(n).toLocaleString()}`;
}

export function ExpensePieChart({
  data,
  onCategoryClick,
}: {
  data: PieData[];
  onCategoryClick?: (label: string) => void;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.amount, 0);
  const chartData = data.map((d) => ({ name: d.label, value: d.amount }));

  const handleClick = (_: any, index: number) => {
    setActiveIndex(index);
    if (onCategoryClick) onCategoryClick(data[index].label);
  };

  const selected = activeIndex !== null ? data[activeIndex] : null;

  return (
    <div className="d-pie-wrap">
      <div className="d-pie-ring">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={44}
              outerRadius={66}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              onClick={handleClick}
              style={{ cursor: "pointer" }}
            >
              {chartData.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => formatTWD(Number(value))}
              contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.75rem" }}
              labelStyle={{ color: "#e2e8f0" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="d-pie-center">
          <span className="d-pie-center-val">{formatTWD(total)}</span>
        </div>
      </div>
      <div className="d-pie-legend">
        {chartData.map((d, i) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(0) : "0";
          const isActive = activeIndex === i;
          return (
            <div
              key={d.name}
              className={`d-pie-item ${isActive ? "active" : ""}`}
              onClick={() => handleClick(null as any, i)}
              style={{ cursor: "pointer", opacity: activeIndex === null || activeIndex === i ? 1 : 0.5 }}
            >
              <span className="d-pie-dot" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="d-pie-name">{d.name}</span>
              <span className="d-pie-pct">{pct}%</span>
              <span className="d-pie-amt">{formatTWD(d.value)}</span>
            </div>
          );
        })}
      </div>

      {/* Selected category detail — desktop only */}
      {selected && (
        <div className="d-pie-detail d-desktop-only">
          <div className="d-pie-detail-header">
            <span style={{ color: COLORS[activeIndex ?? 0 % COLORS.length], fontWeight: 700 }}>
              {selected.label}
            </span>
            <span>{formatTWD(selected.amount)}（{total > 0 ? ((selected.amount / total) * 100).toFixed(0) : 0}%）</span>
          </div>
        </div>
      )}
    </div>
  );
}
