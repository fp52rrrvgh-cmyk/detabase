"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";

type Debt = {
  id: string;
  creditor: string;
  remaining: number;
  min_payment: number;
  interest_rate: number;
  next_due_date: string | null;
  debt_type: string;
  status: string;
  principal: number;
  notes: string;
};

const DEBT_TYPES = [
  { value: "loan", label: "貸款" },
  { value: "credit_card", label: "信用卡" },
  { value: "installment", label: "分期" },
  { value: "personal", label: "私人借貸" },
  { value: "other", label: "其他" },
];

const emptyForm = {
  creditor: "", debt_type: "loan", principal: "", remaining: "",
  interest_rate: "", min_payment: "", next_due_date: "",
};

export default function DebtsPage() {
  const auth = useAuth(() => {});
  return (
    <div className="db-page">
      {auth.authStatus !== "signed_in" ? (
        <p className="status-message status-muted" role="status">請先登入。</p>
      ) : (
        <>
          <h2 className="d-title">債務管理</h2>
          <p className="d-title-sub">Debt Command Center</p>
          <DebtList supabase={auth.supabase} userId={auth.session?.user?.id} />
        </>
      )}
    </div>
  );
}

function DebtList({ supabase, userId }: { supabase: any; userId: string | undefined }) {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"remaining" | "interest_rate" | "next_due_date">("next_due_date");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editRemaining, setEditRemaining] = useState("");

  const load = useCallback(() => {
    if (!supabase || !userId) { setLoading(false); return; }
    let cancelled = false;
    supabase.from("finance_debts")
      .select("id, creditor, remaining, min_payment, interest_rate, next_due_date, debt_type, status, principal, notes")
      .eq("user_id", userId)
      .order("next_due_date", { ascending: true, nullsFirst: false })
      .then(({ data, error }: any) => {
        if (!cancelled && error) setError(error.message);
        if (!cancelled && !error && data) setDebts(data);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [supabase, userId]);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!supabase || !form.creditor || !form.principal) return;
    setSubmitting(true);
    const { error } = await supabase.from("finance_debts").insert({
      creditor: form.creditor, debt_type: form.debt_type,
      principal: Number(form.principal), remaining: Number(form.remaining || form.principal),
      interest_rate: Number(form.interest_rate || 0),
      min_payment: Number(form.min_payment || 0),
      next_due_date: form.next_due_date || null,
      user_id: userId,
    });
    setSubmitting(false);
    if (!error) { setForm(emptyForm); setShowForm(false); load(); }
    else setError(error.message);
  }

  async function handleUpdateRemaining(debtId: string) {
    if (!supabase) return;
    await supabase.from("finance_debts").update({ remaining: Number(editRemaining) }).eq("id", debtId);
    setEditId(null); load();
  }

  async function handleClose(debtId: string) {
    if (!supabase) return;
    await supabase.from("finance_debts").update({
      status: "closed", remaining: 0, closed_at: new Date().toISOString(),
    }).eq("id", debtId);
    load();
  }

  const activeDebts = debts.filter((d) => d.status === "active" && d.remaining > 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdue = activeDebts.filter((d) => d.next_due_date && d.next_due_date < today);
  const totalRemaining = activeDebts.reduce((s, d) => s + Number(d.remaining), 0);
  const totalMinPayment = activeDebts.reduce((s, d) => s + Number(d.min_payment || 0), 0);

  if (loading) return <p className="status-message status-muted">載入中…</p>;
  if (error) return <p className="status-message status-error" role="alert">{error}</p>;
  if (!supabase) return <p className="status-message status-muted">系統設定中。</p>;

  const sorted = [...activeDebts].sort((a, b) => {
    if (sortBy === "remaining") return Number(b.remaining) - Number(a.remaining);
    if (sortBy === "interest_rate") return Number(b.interest_rate) - Number(a.interest_rate);
    if (!a.next_due_date && !b.next_due_date) return 0;
    if (!a.next_due_date) return 1;
    if (!b.next_due_date) return -1;
    return a.next_due_date.localeCompare(b.next_due_date);
  });

  return (
    <div className="debt-mobile-view">
      {overdue.length > 0 && <div className="debt-alert">⚠️ {overdue.length} 筆逾期</div>}

      <div className="debt-summary-card">
        <div className="debt-summary-row">
          <span>總剩餘</span>
          <span className="danger">TWD {totalRemaining.toLocaleString()}</span>
        </div>
        <div className="debt-summary-row">
          <span>最低應繳</span>
          <span>TWD {totalMinPayment.toLocaleString()}</span>
        </div>
        <div className="debt-summary-row">
          <span>筆數</span>
          <span>{activeDebts.length} 筆</span>
        </div>
      </div>

      {/* Add button */}
      <button className="debt-add-btn" onClick={() => setShowForm(!showForm)} type="button">
        {showForm ? "取消" : "＋ 新增債務"}
      </button>

      {/* Add form */}
      {showForm && (
        <div className="debt-form">
          <input className="d-input" placeholder="債權人" value={form.creditor} onChange={(e) => setForm({ ...form, creditor: e.target.value })} />
          <select className="d-input" value={form.debt_type} onChange={(e) => setForm({ ...form, debt_type: e.target.value })}>
            {DEBT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input className="d-input" type="number" placeholder="本金" value={form.principal} onChange={(e) => setForm({ ...form, principal: e.target.value })} />
          <input className="d-input" type="number" placeholder="剩餘（預設=本金）" value={form.remaining} onChange={(e) => setForm({ ...form, remaining: e.target.value })} />
          <input className="d-input" type="number" placeholder="利率 %" value={form.interest_rate} onChange={(e) => setForm({ ...form, interest_rate: e.target.value })} />
          <input className="d-input" type="number" placeholder="最低應繳" value={form.min_payment} onChange={(e) => setForm({ ...form, min_payment: e.target.value })} />
          <input className="d-input" type="date" placeholder="到期日" value={form.next_due_date} onChange={(e) => setForm({ ...form, next_due_date: e.target.value })} />
          <button className="debt-submit-btn" onClick={handleAdd} disabled={submitting} type="button">
            {submitting ? "新增中…" : "新增債務"}
          </button>
        </div>
      )}

      {/* Sort */}
      <div className="debt-sort-row">
        {[
          { key: "next_due_date", label: "到期日" },
          { key: "remaining", label: "金額" },
          { key: "interest_rate", label: "利率" },
        ].map((s) => (
          <button key={s.key} className={`debt-sort-btn ${sortBy === s.key ? "active" : ""}`}
            onClick={() => setSortBy(s.key as any)} type="button">{s.label}</button>
        ))}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <p className="status-message status-muted">目前無債務，點擊上方「新增債務」開始。</p>
      ) : (
        sorted.map((debt) => {
          const isOverdue = debt.next_due_date && debt.next_due_date < today;
          const isEditing = editId === debt.id;
          return (
            <div key={debt.id} className={`debt-card ${isOverdue ? "debt-overdue" : ""}`}>
              <div className="debt-card-header" onClick={() => { setEditId(isEditing ? null : debt.id); setEditRemaining(String(debt.remaining)); }}>
                <span className="debt-card-creditor">{debt.creditor || "未命名"}</span>
                <span className={`debt-card-badge ${debt.debt_type}`}>{debt.debt_type}</span>
              </div>
              <div className="debt-card-body">
                <div className="debt-card-amount">
                  <span className="debt-label">剩餘</span>
                  <span className="debt-value danger">TWD {Number(debt.remaining).toLocaleString()}</span>
                </div>
                <div className="debt-card-details">
                  <span>最低 {Number(debt.min_payment || 0).toLocaleString()}</span>
                  <span>利率 {Number(debt.interest_rate)}%</span>
                  {debt.next_due_date && <span className={isOverdue ? "danger" : ""}>到期 {debt.next_due_date}</span>}
                </div>
              </div>
              {isEditing && (
                <div className="debt-edit-actions">
                  <div className="debt-edit-row">
                    <span>調整剩餘</span>
                    <input className="d-input" type="number" value={editRemaining}
                      onChange={(e) => setEditRemaining(e.target.value)} />
                    <button className="debt-small-btn" onClick={() => handleUpdateRemaining(debt.id)} type="button">更新</button>
                  </div>
                  <button className="debt-small-btn debt-close-btn" onClick={() => handleClose(debt.id)} type="button">✓ 結清</button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
