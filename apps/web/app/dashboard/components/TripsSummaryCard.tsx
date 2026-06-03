"use client";

import type { TripSummary, TripRecord } from "../hooks/useTrips";

function fmt(n: number) {
  return n.toLocaleString();
}

export function TripsSummaryCard({
  summary,
  trips,
}: {
  summary: TripSummary;
  trips: TripRecord[];
}) {
  if (summary.count === 0) {
    return (
      <div className="d-card">
        <div className="d-card-h">
          <span className="d-card-t">🚛 本月車趟</span>
        </div>
        <p className="status-message status-muted" style={{ padding: "12px 0" }}>
          本月尚無車趟記錄
        </p>
      </div>
    );
  }

  return (
    <div className="d-card">
      <div className="d-card-h">
        <span className="d-card-t">🚛 本月車趟</span>
      </div>
      {/* 摘要 KPI */}
      <div className="d-trip-kpis">
        <div className="d-trip-kpi">
          <span className="d-trip-kpi-val">{summary.count}</span>
          <span className="d-trip-kpi-lbl">趟</span>
        </div>
        <div className="d-trip-kpi">
          <span className="d-trip-kpi-val">{fmt(summary.totalFuel)}</span>
          <span className="d-trip-kpi-lbl">油資</span>
        </div>
        <div className="d-trip-kpi">
          <span className="d-trip-kpi-val">{summary.clients.length}</span>
          <span className="d-trip-kpi-lbl">客戶</span>
        </div>
      </div>
      {/* 客戶列表 */}
      <div className="d-trip-clients">
        {summary.clients.map((c) => (
          <span key={c} className="d-trip-client-tag">{c}</span>
        ))}
      </div>
      {/* 車趟列表 */}
      <div className="d-tx-list" style={{ marginTop: 8 }}>
        {trips.slice(0, 10).map((t) => (
          <div key={t.id} className="d-tx-item">
            <div className="d-tx-left">
              <span className="d-tx-icon trip">🚛</span>
              <div>
                <div className="d-tx-desc">{t.client}</div>
                <div className="d-tx-cat">{t.origin} → {t.dest}{t.note ? ` · ${t.note}` : ""}</div>
              </div>
            </div>
            <div className="d-tx-amt expense">
              {t.fuel > 0 ? `油 $${fmt(t.fuel)}` : t.date.slice(5)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
