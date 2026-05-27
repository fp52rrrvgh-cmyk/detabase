"use client";

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export type TrendData = { date: string; amount: number };

function formatTWD(n: number): string {
  return `TWD ${Math.round(n).toLocaleString()}`;
}

export function DailyTrendChart({ data }: { data: TrendData[] }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (data.length === 0) return null;

  const chartData = data.slice(-isDesktop ? 60 : 24);
  const maxVal = Math.max(...chartData.map((d) => d.amount), 1);

  return (
    <div className="d-trend-chart">
      <ResponsiveContainer width="100%" height={isDesktop ? 220 : 150}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            tick={{ fill: "#475569", fontSize: 9 }}
            tickFormatter={(v: string) => v.slice(5)}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 9 }}
            tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: any) => formatTWD(Number(value))}
            labelFormatter={(label: any) => `📅 ${label ?? ""}`}
            contentStyle={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 8, fontSize: "0.75rem" }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#2dd4bf"
            strokeWidth={2}
            dot={isDesktop}
            activeDot={{ r: 5, fill: "#2dd4bf", stroke: "#0f172a", strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
