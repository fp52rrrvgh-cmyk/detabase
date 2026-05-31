"use client";

export function DashboardSkeleton() {
  return (
    <div className="db-page">
      {/* Header skeleton */}
      <div className="d-header">
        <div>
          <div className="skel skel-title" style={{ width: 120, height: 20, marginBottom: 6 }} />
          <div className="skel skel-text" style={{ width: 200, height: 12 }} />
        </div>
        <div className="skel skel-box" style={{ width: 80, height: 28, borderRadius: 8 }} />
      </div>

      {/* Daily spending gauge skeleton */}
      <div style={{ marginBottom: 16 }}>
        <div className="skel skel-text" style={{ width: 120, height: 14, marginBottom: 8 }} />
        <div className="skel skel-title" style={{ width: 200, height: 44, marginBottom: 12 }} />
        <div className="skel skel-box" style={{ width: "100%", height: 16, borderRadius: 8, marginBottom: 8 }} />
        <div className="skel skel-text" style={{ width: 160, height: 14 }} />
      </div>

      {/* Briefing skeleton */}
      <div className="skel skel-box" style={{ width: "100%", height: 48, borderRadius: 10 }} />

      {/* KPI row skeleton */}
      <div className="d-kpi-row-skel">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="skel skel-card" style={{ height: 72, borderRadius: 12 }} />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="d-mid-grid-skel">
        <div className="skel skel-card" style={{ height: 180, borderRadius: 14 }} />
        <div className="skel skel-card" style={{ height: 180, borderRadius: 14 }} />
      </div>

      {/* Bottom skeleton */}
      <div className="d-bottom-grid-skel">
        <div className="skel skel-card" style={{ height: 120, borderRadius: 14 }} />
        <div className="skel skel-card" style={{ height: 200, borderRadius: 14 }} />
        <div className="skel skel-card" style={{ height: 160, borderRadius: 14 }} />
      </div>
    </div>
  );
}
