"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import { runtimeConfig } from "../constants";

/* ── Agent 工位定義 ── */
const AGENTS = [
  { id: "orchestrator", name: "協調官", icon: "🎪", color: "#8b5cf6", role: "任務拆解 · 派工" },
  { id: "architect", name: "架構師", icon: "🏗️", color: "#3b82f6", role: "系統設計 · 審圖" },
  { id: "builder", name: "建造者", icon: "🔧", color: "#f97316", role: "實作功能 · Coding" },
  { id: "reviewer", name: "審查官", icon: "🛡️", color: "#ef4444", role: "Codex Audit · 監督" },
];

const STAFF = [
  { id: "security", name: "安全官", icon: "🔐", color: "#ef4444" },
  { id: "memory", name: "記憶官", icon: "🧠", color: "#8b5cf6" },
  { id: "architecture", name: "架構官", icon: "📐", color: "#3b82f6" },
  { id: "research", name: "研究官", icon: "🔬", color: "#10b981" },
];

const IDLE_ACTIONS = [
  { emoji: "☕", label: "喝咖啡" },
  { emoji: "💤", label: "打盹" },
  { emoji: "🏋️", label: "健身" },
  { emoji: "🚿", label: "休息" },
  { emoji: "📖", label: "看文件" },
];

type OPCState = {
  ts: number; time: string; gw: string; docker: number;
  disk_pct: string; disk_avail: string; mem_kb: number;
  sessions: number; skills: number; scripts: number; profiles: number;
};

function hashIdleAction(id: string, tick: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h + tick) % IDLE_ACTIONS.length;
}

export default function OPCPage() {
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const [state, setState] = useState<OPCState | null>(null);
  const [time, setTime] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleString("zh-TW", { timeZone: "Asia/Taipei" }));
      setTick((t) => t + 1);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const fetchState = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("opc_state").select("data").eq("id", 1).single();
    if (data?.data) setState(data.data as OPCState);
  }, [supabase]);

  useEffect(() => {
    fetchState();
    const t = setInterval(fetchState, 10000);
    return () => clearInterval(t);
  }, [fetchState]);

  const gwActive = state?.gw === "active";

  return (
    <div className="db-page">
      {/* Header */}
      <div className="d-header">
        <div className="d-header-left">
          <h2 className="d-title">⚔️ OPC 指揮中心</h2>
          <p className="d-title-sub" style={{ color: gwActive ? "#22c55e" : "#ef4444" }}>
            {gwActive ? "🟢 系統在線" : "🔴 系統離線"} · {time || "—"}
          </p>
        </div>
      </div>

      {/* ── 指揮鏈 ── */}
      <div style={{ textAlign: "center", padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <CmdNode icon="🎯" name="小新" role="總統 · 最終決策" color="#f59e0b" />
        <div style={{ color: "#4a5568", fontSize: "0.8rem" }}>▼</div>
        <CmdNode icon="🐴" name="小馬" role="三軍指揮官 · 參謀總長" color="#14b8a6" active />
      </div>

      {/* ── 閃電戰 OPC 四將（Marvis 工位風格） ── */}
      <div style={{ marginTop: 12 }}>
        <h3 style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          ⚡ 閃電戰 OPC
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {AGENTS.map((a) => {
            const action = IDLE_ACTIONS[hashIdleAction(a.id, tick)];
            const isActive = tick % 7 === 0; // simulate: 1/7 chance of being "busy"
            return (
              <div key={a.id} style={{
                background: "var(--panel)", border: `1.5px solid ${a.color}22`, borderRadius: 12,
                padding: "14px 12px", textAlign: "center", position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: a.color, opacity: isActive ? 1 : 0.2,
                  transition: "opacity 1s",
                }} />
                <span style={{ fontSize: "1.6rem", display: "block", marginBottom: 4 }}>{a.icon}</span>
                <div style={{ fontWeight: 700, fontSize: "0.82rem", color: "#e2e8f0" }}>{a.name}</div>
                <div style={{ fontSize: "0.62rem", color: "#64748b", marginTop: 1 }}>{a.role}</div>
                <div style={{
                  marginTop: 8, padding: "4px 8px", borderRadius: 10,
                  background: isActive ? `${a.color}18` : "transparent",
                  color: isActive ? a.color : "#4a5568",
                  fontSize: "0.65rem", fontWeight: 500,
                  transition: "all 0.5s",
                }}>
                  {isActive ? "⚡ 執行中" : `${action.emoji} ${action.label}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 常駐參謀團 ── */}
      <div style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          🛡️ 常駐參謀團
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {STAFF.map((s) => {
            const action = IDLE_ACTIONS[hashIdleAction(s.id, tick + 10)];
            const onDuty = s.id === "security"; // 安全官始終在線
            return (
              <div key={s.id} style={{
                background: "var(--panel)", border: `1px solid ${s.color}18`, borderRadius: 10,
                padding: "10px", display: "flex", alignItems: "center", gap: 10,
              }}>
                <span style={{ fontSize: "1.3rem" }}>{s.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#e2e8f0" }}>{s.name}</div>
                  <div style={{ fontSize: "0.6rem", color: onDuty ? "#22c55e" : "#4a5568" }}>
                    {onDuty ? "🟢 巡邏中" : `${action.emoji} ${action.label}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 系統狀態網格（Live） ── */}
      <div style={{ marginTop: 14 }}>
        <h3 style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          📡 系統狀態 {state ? "" : "(載入中…)"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
          <StatCard label="Gateway" value={state?.gw === "active" ? "🟢" : "🔴"} />
          <StatCard label="Docker" value={state?.docker ? `${state.docker} C` : "—"} />
          <StatCard label="Disk" value={state?.disk_pct ?? "—"} />
          <StatCard label="Avail" value={state?.disk_avail ?? "—"} />
          <StatCard label="Sessions" value={state?.sessions?.toLocaleString() ?? "—"} />
          <StatCard label="Skills" value={state?.skills?.toString() ?? "—"} />
          <StatCard label="Scripts" value={state?.scripts?.toString() ?? "—"} />
          <StatCard label="Profiles" value={state?.profiles?.toString() ?? "—"} />
        </div>
      </div>
    </div>
  );
}

function CmdNode({ icon, name, role, color, active }: { icon: string; name: string; role: string; color: string; active?: boolean }) {
  return (
    <div style={{
      background: active ? `${color}14` : "var(--panel)",
      border: `2px solid ${color}${active ? "66" : "22"}`,
      borderRadius: 14, padding: "12px 20px", textAlign: "center",
      minWidth: 200, transition: "all 0.3s",
    }}>
      <span style={{ fontSize: "2rem", display: "block", marginBottom: 2 }}>{icon}</span>
      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#e2e8f0" }}>{name}</div>
      <div style={{ fontSize: "0.65rem", color: "#64748b", marginTop: 1 }}>{role}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--surface)", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#14b8a6" }}>{value}</div>
      <div style={{ fontSize: "0.6rem", color: "#64748b", marginTop: 1 }}>{label}</div>
    </div>
  );
}
