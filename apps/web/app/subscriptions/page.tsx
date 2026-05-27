"use client";

export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatAmount } from "../lib/format";
import { runtimeConfig, CORE_RUNTIME_KEYS } from "../constants";
import { hasRuntimeFields } from "../lib/runtime";

// --- Types ---

type SubscriptionRow = {
  id: string;
  movement_type: "income" | "expense";
  amount: number;
  category_id: string;
  account_id: string;
  description: string;
  frequency: "weekly" | "monthly" | "yearly";
  next_date: string;
  is_active: boolean;
};

type CategoryRef = { id: string; display_name: string };
type AccountRef = { id: string; display_name: string };

type PageState =
  | { status: "loading" }
  | { status: "success"; items: SubscriptionRow[]; categories: CategoryRef[]; accounts: AccountRef[] }
  | { status: "failure"; message: string };

const FREQ_LABELS: Record<string, string> = {
  weekly: "每週",
  monthly: "每月",
  yearly: "每年",
};

// --- Page ---

export default function SubscriptionsPage() {
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const [state, setState] = useState<PageState>({ status: "loading" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCat, setEditCat] = useState("");
  const [editAcct, setEditAcct] = useState("");
  const [editFreq, setEditFreq] = useState<string>("monthly");
  const [editNext, setEditNext] = useState("");
  const [newType, setNewType] = useState<"expense" | "income">("expense");
  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newAcct, setNewAcct] = useState("");
  const [newFreq, setNewFreq] = useState<string>("monthly");
  const [newNext, setNewNext] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadData = useCallback(async () => {
    if (!supabase) {
      setState({ status: "failure", message: "Runtime 設定不完整" });
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setState({ status: "failure", message: "請先登入" });
      return;
    }

    setState({ status: "loading" });

    const [subResult, catResult, acctResult] = await Promise.all([
      supabase.from("finance_subscriptions").select("*").order("next_date", { ascending: true }).limit(100),
      supabase.from("finance_categories").select("id,display_name").eq("is_active", true).limit(50),
      supabase.from("finance_accounts").select("id,display_name").eq("is_active", true).limit(50),
    ]);

    if (subResult.error) {
      setState({ status: "failure", message: "讀取訂閱失敗" });
      return;
    }

    setState({
      status: "success",
      items: (subResult.data ?? []) as SubscriptionRow[],
      categories: (catResult.data ?? []) as CategoryRef[],
      accounts: (acctResult.data ?? []) as AccountRef[],
    });
  }, [supabase]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // --- Toggle active ---
  async function toggleActive(sub: SubscriptionRow) {
    if (!supabase) return;
    const { error } = await supabase
      .from("finance_subscriptions")
      .update({ is_active: !sub.is_active })
      .eq("id", sub.id);
    if (error) { setToast("更新失敗"); return; }
    setToast(sub.is_active ? "已停用" : "已啟用");
    await loadData();
  }

  // --- Start editing ---
  function startEdit(sub: SubscriptionRow) {
    setEditingId(sub.id);
    setEditAmount(String(sub.amount));
    setEditDesc(sub.description);
    setEditCat(sub.category_id);
    setEditAcct(sub.account_id);
    setEditFreq(sub.frequency);
    setEditNext(sub.next_date);
  }

  // --- Save edit ---
  async function saveEdit(id: string) {
    if (!supabase) return;
    const amount = parseInt(editAmount, 10);
    if (!amount || amount <= 0) { setToast("請輸入正確金額"); return; }
    const { error } = await supabase
      .from("finance_subscriptions")
      .update({
        amount,
        description: editDesc.trim(),
        category_id: editCat,
        account_id: editAcct,
        frequency: editFreq,
        next_date: editNext,
      })
      .eq("id", id);
    if (error) { setToast("儲存失敗"); return; }
    setEditingId(null);
    setToast("已儲存");
    await loadData();
  }

  // --- Add new ---
  async function addNew() {
    if (!supabase) return;
    const amount = parseInt(newAmount, 10);
    if (!amount || amount <= 0) { setToast("請輸入正確金額"); return; }
    if (!newCat) { setToast("請選擇分類"); return; }
    if (!newAcct) { setToast("請選擇帳戶"); return; }
    if (!newNext) { setToast("請選擇下次日期"); return; }

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { setToast("請先登入"); return; }

    const { error } = await supabase.from("finance_subscriptions").insert({
      user_id: sessionData.session.user.id,
      movement_type: newType,
      amount,
      category_id: newCat,
      account_id: newAcct,
      description: newDesc.trim() || (newType === "expense" ? "訂閱支出" : "訂閱收入"),
      frequency: newFreq,
      next_date: newNext,
    });
    if (error) { setToast("新增失敗"); return; }
    setNewAmount("");
    setNewDesc("");
    setNewCat("");
    setNewAcct("");
    setNewNext("");
    setToast("已新增");
    await loadData();
  }

  // --- Render ---

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const upcomingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3).toISOString().slice(0, 10);

  return (
    <div className="db-page">
      <div className="d-header">
        <div>
          <h2 className="d-title">📋 固定訂閱</h2>
          <p className="d-desc">管理每月自動產生的固定收支項目</p>
        </div>
        <button className="d-refresh" onClick={loadData} type="button">
          ⟳ {new Date().toLocaleDateString("zh-TW")}
        </button>
      </div>

      {/* Toast */}
      {toast && <p className="status-message" role="status">{toast}</p>}

      {state.status === "loading" && <p className="status-message" role="status">載入中...</p>}
      {state.status === "failure" && <p className="status-message status-error" role="alert">{state.message}</p>}

      {state.status === "success" && (
        <>
          {/* ===== Add new ===== */}
          <div className="d-card" style={{ marginBottom: 16 }}>
            <div className="d-card-h"><span className="d-card-t">新增訂閱</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={`d-btn ${newType === "expense" ? "d-btn-active" : ""}`}
                  onClick={() => setNewType("expense")} type="button"
                >支出</button>
                <button
                  className={`d-btn ${newType === "income" ? "d-btn-active" : ""}`}
                  onClick={() => setNewType("income")} type="button"
                >收入</button>
              </div>
              <input className="d-input" type="number" placeholder="金額" value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)} />
              <input className="d-input" type="text" placeholder="說明（選填）" value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select className="d-input" value={newCat} onChange={(e) => setNewCat(e.target.value)}>
                  <option value="">分類</option>
                  {state.categories.filter((c) => c.display_name).map((c) => (
                    <option key={c.id} value={c.id}>{c.display_name}</option>
                  ))}
                </select>
                <select className="d-input" value={newAcct} onChange={(e) => setNewAcct(e.target.value)}>
                  <option value="">帳戶</option>
                  {state.accounts.filter((a) => a.display_name).map((a) => (
                    <option key={a.id} value={a.id}>{a.display_name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select className="d-input" value={newFreq} onChange={(e) => setNewFreq(e.target.value)}>
                  <option value="weekly">每週</option>
                  <option value="monthly">每月</option>
                  <option value="yearly">每年</option>
                </select>
                <input className="d-input" type="date" value={newNext}
                  onChange={(e) => setNewNext(e.target.value)} />
              </div>
              <button className="d-btn d-btn-primary" onClick={addNew} type="button">新增</button>
            </div>
          </div>

          {/* ===== List ===== */}
          <div className="d-card">
            <div className="d-card-h"><span className="d-card-t">訂閱列表</span></div>
            <div className="d-tx-list">
              {state.items.length === 0 && <p className="status-message status-muted">尚無訂閱項目</p>}
              {state.items.map((sub) => {
                const isEditing = editingId === sub.id;
                const catName = state.categories.find((c) => c.id === sub.category_id)?.display_name ?? "未分類";
                const acctName = state.accounts.find((a) => a.id === sub.account_id)?.display_name ?? "未知";
                const isUpcoming = sub.is_active && sub.next_date <= upcomingDate && sub.next_date >= todayStr;
                const isOverdue = sub.is_active && sub.next_date < todayStr;

                return (
                  <div key={sub.id} className="d-tx-item" style={{ opacity: sub.is_active ? 1 : 0.4 }}>
                    {isEditing ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", padding: "8px 0" }}>
                        <input className="d-input" type="number" value={editAmount}
                          onChange={(e) => setEditAmount(e.target.value)} />
                        <input className="d-input" type="text" value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          <select className="d-input" value={editCat} onChange={(e) => setEditCat(e.target.value)}>
                            {state.categories.filter((c) => c.display_name).map((c) => (
                              <option key={c.id} value={c.id}>{c.display_name}</option>
                            ))}
                          </select>
                          <select className="d-input" value={editAcct} onChange={(e) => setEditAcct(e.target.value)}>
                            {state.accounts.filter((a) => a.display_name).map((a) => (
                              <option key={a.id} value={a.id}>{a.display_name}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                          <select className="d-input" value={editFreq} onChange={(e) => setEditFreq(e.target.value)}>
                            <option value="weekly">每週</option>
                            <option value="monthly">每月</option>
                            <option value="yearly">每年</option>
                          </select>
                          <input className="d-input" type="date" value={editNext}
                            onChange={(e) => setEditNext(e.target.value)} />
                          <div style={{ display: "flex", gap: 4 }}>
                            <button className="d-btn d-btn-sm d-btn-primary" onClick={() => saveEdit(sub.id)} type="button">✓</button>
                            <button className="d-btn d-btn-sm" onClick={() => setEditingId(null)} type="button">✕</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="d-tx-left">
                          <span className={`sb-freq-badge ${sub.frequency}`}>
                            {sub.frequency === "weekly" ? "W" : sub.frequency === "monthly" ? "M" : "Y"}
                          </span>
                          <div>
                            <div className="d-tx-desc">{sub.description}</div>
                            <div className="d-tx-cat">{catName} · {acctName} · {FREQ_LABELS[sub.frequency]}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ textAlign: "right" }}>
                            <div className={`d-tx-amt ${sub.movement_type === "income" ? "income" : "danger"}`}>
                              {sub.movement_type === "income" ? "+" : "-"}TWD {formatAmount(sub.amount, "TWD")}
                            </div>
                            <div className="d-tx-cat">
                              {isOverdue ? "⚠️ 已過期" : isUpcoming ? "🔔 即將到期" : sub.next_date}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                            <button className="d-btn d-btn-sm" onClick={() => startEdit(sub)} type="button">✏️</button>
                            <button className="d-btn d-btn-sm" onClick={() => toggleActive(sub)} type="button">
                              {sub.is_active ? "⏸" : "▶️"}
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
