"use client";

import { useState, useEffect } from "react";

/* ── 靜態 OPC 架構資料 ── */
const COMMANDER = { name: "小新", role: "總統 / 最終決策", icon: "🎯", color: "#f59e0b" };
const XIAOMA = { name: "小馬", role: "三軍指揮官 / 參謀總長", icon: "🐴", color: "#14b8a6" };
const BATTLE_OPS = [
  { name: "協調官", role: "拆任務 / 派工", icon: "🎪", color: "#8b5cf6" },
  { name: "架構師", role: "設計架構 / 審圖", icon: "🏗️", color: "#3b82f6" },
  { name: "建造者", role: "實作功能 / Coding", icon: "🔧", color: "#f97316" },
  { name: "審查官", role: "Codex Audit / 監督", icon: "🛡️", color: "#ef4444" },
];
const STAFF = [
  { name: "安全官", role: "每小時巡邏 RLS/權限", icon: "🔐", color: "#ef4444", status: "active" },
  { name: "記憶官", role: "每日整理 Engram/MEMORY", icon: "🧠", color: "#8b5cf6", status: "standby" },
  { name: "架構官", role: "每日審查系統架構", icon: "📐", color: "#3b82f6", status: "standby" },
  { name: "研究官", role: "每週研究報告", icon: "🔬", color: "#10b981", status: "standby" },
];

/* ── helpers ── */
function StatusDot({ status }: { status: string }) {
  const color = status === "active" ? "#22c55e" : status === "standby" ? "#f59e0b" : "#64748b";
  return <span style={{ display:"inline-block", width:8, height:8, borderRadius:4, background:color, marginRight:6 }} />;
}

export default function OPCPage() {
  const [time, setTime] = useState("");

  useEffect(() => {
    setTime(new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }));
    const t = setInterval(() => setTime(new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" })), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="db-page">
      {/* Header */}
      <div className="d-header">
        <div className="d-header-left">
          <h2 className="d-title">⚔️ OPC 指揮中心</h2>
          <p className="d-title-sub">{time || "載入中…"}</p>
        </div>
      </div>

      {/* ── 指揮鏈 ── */}
      <div style={styles.chain}>
        {/* 總統 */}
        <div style={{ ...styles.node, borderColor: COMMANDER.color }}>
          <span style={styles.nodeIcon}>{COMMANDER.icon}</span>
          <div style={styles.nodeName}>{COMMANDER.name}</div>
          <div style={styles.nodeRole}>{COMMANDER.role}</div>
        </div>
        <div style={styles.arrow}>▼</div>
        {/* 小馬 */}
        <div style={{ ...styles.node, borderColor: XIAOMA.color, background: "rgba(20,184,166,0.08)" }}>
          <span style={styles.nodeIcon}>{XIAOMA.icon}</span>
          <div style={styles.nodeName}>{XIAOMA.name}</div>
          <div style={styles.nodeRole}>{XIAOMA.role}</div>
        </div>
        <div style={styles.arrow}>▼</div>
        {/* 閃電戰 OPC */}
        <div style={styles.row}>
          {BATTLE_OPS.map((op) => (
            <div key={op.name} style={{ ...styles.node, borderColor: op.color, minWidth: 70 }}>
              <span style={styles.nodeIcon}>{op.icon}</span>
              <div style={{ ...styles.nodeName, fontSize: "0.72rem" }}>{op.name}</div>
              <div style={{ ...styles.nodeRole, fontSize: "0.6rem" }}>{op.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 常駐參謀團 ── */}
      <div style={styles.sectionTitle}>🛡️ 常駐參謀團</div>
      <div style={styles.staffGrid}>
        {STAFF.map((s) => (
          <div key={s.name} style={{ ...styles.staffCard, borderColor: s.color }}>
            <div style={styles.staffHeader}>
              <span style={{ fontSize: "1.2rem" }}>{s.icon}</span>
              <StatusDot status={s.status} />
              <span style={{ fontSize: "0.65rem", color: s.color }}>{s.status === "active" ? "在線" : "待命"}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.8rem", color: "#e2e8f0" }}>{s.name}</div>
            <div style={{ fontSize: "0.65rem", color: "#64748b" }}>{s.role}</div>
          </div>
        ))}
      </div>

      {/* ── 系統狀態 ── */}
      <div style={styles.sectionTitle}>📡 系統狀態</div>
      <div style={styles.statusGrid}>
        <StatusCard label="Sessions" value="1,846" />
        <StatusCard label="Skills" value="157" />
        <StatusCard label="Scripts" value="70" />
        <StatusCard label="MCP" value="13" />
        <StatusCard label="Cron Jobs" value="54" />
        <StatusCard label="Profiles" value="6" />
        <StatusCard label="Docker" value="Healthy" />
        <StatusCard label="Gateway" value="Running" />
      </div>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--surface)",
      borderRadius: 8, padding: "10px 12px", textAlign: "center",
    }}>
      <div style={{ fontSize: "1rem", fontWeight: 700, color: "#14b8a6" }}>{value}</div>
      <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ── inline styles (avoid CSS bloat for single-page) ── */
const styles: Record<string, React.CSSProperties> = {
  chain: { textAlign: "center", padding: "16px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  node: {
    background: "var(--panel)", border: "2px solid", borderRadius: 12,
    padding: "12px 16px", minWidth: 140, textAlign: "center",
  },
  nodeIcon: { fontSize: "1.6rem", display: "block", marginBottom: 4 },
  nodeName: { fontWeight: 700, fontSize: "0.85rem", color: "#e2e8f0" },
  nodeRole: { fontSize: "0.68rem", color: "#64748b", marginTop: 2 },
  arrow: { fontSize: "0.9rem", color: "#4a5568", lineHeight: 1 },
  row: { display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  sectionTitle: {
    fontSize: "0.78rem", fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.06em",
    marginTop: 20, marginBottom: 8, paddingLeft: 4,
  },
  staffGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 },
  staffCard: {
    background: "var(--panel)", border: "1px solid", borderRadius: 10,
    padding: "10px 12px",
  },
  staffHeader: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 },
  statusGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 },
};
