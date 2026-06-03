"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { useAuth } from "../hooks/useAuth";
import { runtimeConfig } from "../constants";

function monthStart(y: number, m: number) { return `${y}-${String(m).padStart(2,"0")}-01`; }
function monthEnd(y: number, m: number) { const d = new Date(y,m,0).getDate(); return `${y}-${String(m).padStart(2,"0")}-${d}`; }
function fmtDate(d: string) { if (!d) return ""; const p = d.split("-"); return `${p[1]}/${p[2]}`; }

type Trip = {
  id: number; date: string; client: string; origin: string;
  dest: string; note: string; fuel: number;
};

/* ── editable cell ── */
function EditableCell({
  value, onSave, type = "text", className = "",
}: {
  value: string | number; onSave: (v: string) => void;
  type?: "text" | "date" | "number"; className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== String(value ?? "")) onSave(draft);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`t-edit ${className}`}
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") { setDraft(String(value ?? "")); setEditing(false); }
        }}
      />
    );
  }

  const display = type === "date" ? fmtDate(String(value))
    : type === "number" ? (Number(value) || 0).toLocaleString()
    : String(value ?? "");

  return (
    <div className={`t-cell ${className}`} onClick={() => { setDraft(String(value ?? "")); setEditing(true); }}>
      {display || <span className="t-placeholder">—</span>}
    </div>
  );
}

/* ── fuel chip ── */
function FuelCell({ value, onSave }: { value: number; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value || ""));
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== String(value || "")) onSave(draft);
  };

  if (editing) {
    return (
      <input
        ref={inputRef} className="t-edit t-edit-fuel" type="number"
        value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(String(value || "")); setEditing(false); } }}
        placeholder="0"
      />
    );
  }

  if (!value) {
    return <div className="t-fuel t-fuel-empty" onClick={() => { setDraft(""); setEditing(true); }}>—</div>;
  }

  return (
    <div className="t-fuel" onClick={() => { setDraft(String(value)); setEditing(true); }}>
      <span className="t-fuel-num">{value.toLocaleString()}</span>
    </div>
  );
}

/* ── page ── */
export default function TripsPage() {
  const auth = useAuth(() => {});
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<Set<number>>(new Set());

  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const isCurrent = year === now.getFullYear() && month === now.getMonth() + 1;

  const fetchTrips = useCallback(async () => {
    if (!supabase) { setError("Runtime 設定不完整"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("請先登入"); setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const { data, error: e } = await supabase
        .from("trips").select("id,date,client,origin,dest,note,fuel")
        .gte("date", monthStart(year, month)).lte("date", monthEnd(year, month))
        .order("date", { ascending: true }).order("id", { ascending: true });
      if (e) throw e;
      setTrips((data ?? []) as Trip[]);
    } catch (e: any) { setError(e?.message ?? "載入失敗"); }
    finally { setLoading(false); }
  }, [supabase, year, month]);

  useEffect(() => { if (auth.authStatus === "signed_in") fetchTrips(); }, [auth.authStatus, fetchTrips]);

  const prev = () => { if (month === 1) { setYear(y => y-1); setMonth(12); } else setMonth(m => m-1); };
  const next = () => { if (month === 12) { setYear(y => y+1); setMonth(1); } else setMonth(m => m+1); };
  const goNow = () => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); };

  const updateCell = async (id: number, field: string, value: string) => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    setSaving(prev => new Set(prev).add(id));
    const patch: any = {};
    if (field === "fuel") patch.fuel = Number(value) || 0;
    else if (field === "date") patch.date = value;
    else patch[field] = value;
    setTrips(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t));
    const { error } = await supabase.from("trips").update(patch).eq("id", id);
    if (!error) { setSaving(prev => { const n = new Set(prev); n.delete(id); return n; }); }
    else { fetchTrips(); setSaving(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  };

  const addRow = async () => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const today = new Date();
    const ds = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
    const { data, error } = await supabase.from("trips")
      .insert({ user_id: session.user.id, date: ds, client: "", origin: "", dest: "", note: "", fuel: 0 })
      .select("id,date,client,origin,dest,note,fuel").single();
    if (!error && data) setTrips(prev => [...prev, data as Trip]);
  };

  const deleteRow = async (id: number, client: string, date: string) => {
    if (!supabase) return;
    const label = `${fmtDate(date)} ${client || "未填客戶"}`;
    if (!window.confirm(`確定刪除這筆車趟？\n${label}`)) return;
    const { error } = await supabase.from("trips").delete().eq("id", id);
    if (!error) setTrips(prev => prev.filter(t => t.id !== id));
  };

  if (auth.authStatus !== "signed_in") {
    return <div className="db-page"><p className="status-message status-muted">請先登入以查看車趟。</p></div>;
  }

  const totalFuel = trips.reduce((s, t) => s + (Number(t.fuel) || 0), 0);
  const clients = [...new Set(trips.map(t => t.client).filter(Boolean))];

  return (
    <div className="db-page">
      {/* ── Header ── */}
      <div className="d-header">
        <div className="d-header-left">
          <h2 className="d-title">🚛 車趟紀錄</h2>
          <p className="d-title-sub">{year} 年 {month} 月</p>
        </div>
        <div className="d-header-right">
          <div className="d-month-nav">
            <button className="d-month-btn" onClick={prev} type="button">‹</button>
            <span className="d-month-label" onClick={goNow}>
              {isCurrent ? <span className="d-month-badge">本月</span> : <>{month}月</>}
            </span>
            <button className="d-month-btn" onClick={next} type="button">›</button>
          </div>
          <button className="d-refresh-btn" onClick={fetchTrips} type="button">⟳</button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="t-stats">
        <div className="t-stat">
          <div className="t-stat-val">{trips.length}</div>
          <div className="t-stat-lbl">總趟數</div>
        </div>
        <div className="t-stat">
          <div className="t-stat-val t-stat-fuel">TWD {totalFuel.toLocaleString()}</div>
          <div className="t-stat-lbl">總油資</div>
        </div>
        <div className="t-stat">
          <div className="t-stat-val">{clients.length}</div>
          <div className="t-stat-lbl">客戶數</div>
        </div>
      </div>

      {/* ── Loading / Error ── */}
      {loading && <p className="status-message status-muted">載入中…</p>}
      {error && <p className="status-message status-error" role="alert">{error}</p>}

      {/* ── Table ── */}
      {!loading && !error && (
        <div className="t-sheet-wrap">
          <table className="t-sheet">
            <thead>
              <tr>
                <th className="tw-date">日期</th>
                <th className="tw-client">客戶</th>
                <th className="tw-from">起點</th>
                <th className="tw-to">抵達</th>
                <th className="tw-note">備註</th>
                <th className="tw-fuel">油資</th>
                <th className="tw-del"></th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className={saving.has(t.id) ? "tr-saving" : ""}>
                  <td><EditableCell value={t.date} type="date" onSave={(v) => updateCell(t.id, "date", v)} /></td>
                  <td><EditableCell value={t.client} onSave={(v) => updateCell(t.id, "client", v)} /></td>
                  <td><EditableCell value={t.origin} onSave={(v) => updateCell(t.id, "origin", v)} /></td>
                  <td><EditableCell value={t.dest} onSave={(v) => updateCell(t.id, "dest", v)} /></td>
                  <td><EditableCell value={t.note} onSave={(v) => updateCell(t.id, "note", v)} /></td>
                  <td><FuelCell value={t.fuel} onSave={(v) => updateCell(t.id, "fuel", v)} /></td>
                  <td>
                    <button className="t-del" onClick={() => deleteRow(t.id, t.client, t.date)} type="button" title="刪除">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M5 2h6M2 4h12M6 6v5M10 6v5M4 4l1 10h6l1-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {trips.length === 0 && (
                <tr><td colSpan={7} className="t-empty">尚無車趟紀錄，點下方按鈕新增第一筆</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add button ── */}
      {!loading && !error && (
        <button className="t-add" onClick={addRow} type="button">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 4v10M4 9h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          新增車趟
        </button>
      )}
    </div>
  );
}
