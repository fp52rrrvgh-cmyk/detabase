"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatAmount } from "../lib/format";
import { runtimeConfig } from "../constants";

// --- Types ---
type AccountType = "cash" | "bank" | "credit_card" | "stored_value" | "digital_account" | "other";

type AccountRow = {
  id: string;
  display_name: string;
  account_type: AccountType;
  initial_balance: number;
  credit_limit: number | null;
  billing_day: number | null;
  total_loan: number | null;
  loan_term_months: number | null;
  interest_rate: number | null;
  description: string | null;
  is_coin_box: boolean;
  is_active: boolean;
};

type PageState =
  | { status: "loading" }
  | { status: "success"; items: AccountRow[] }
  | { status: "failure"; message: string };

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "cash", label: "現金" },
  { value: "bank", label: "銀行" },
  { value: "credit_card", label: "信用卡" },
  { value: "stored_value", label: "儲值" },
  { value: "digital_account", label: "數位帳戶" },
  { value: "other", label: "其他" },
];

const ACCOUNT_TYPE_BADGES: Record<AccountType, string> = {
  cash: "💵 現金",
  bank: "🏦 銀行",
  credit_card: "💳 信用卡",
  stored_value: "🎫 儲值",
  digital_account: "📱 數位帳戶",
  other: "📦 其他",
};

// --- Component ---
export function AccountsTab() {
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const [state, setState] = useState<PageState>({ status: "loading" });
  const [toast, setToast] = useState<string | null>(null);

  // New account form
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<AccountType>("cash");
  const [newBalance, setNewBalance] = useState("0");
  const [newCreditLimit, setNewCreditLimit] = useState("");
  const [newBillingDay, setNewBillingDay] = useState("");
  const [newTotalLoan, setNewTotalLoan] = useState("");
  const [newLoanTerms, setNewLoanTerms] = useState("");
  const [newInterestRate, setNewInterestRate] = useState("");
  const [newIsCoinBox, setNewIsCoinBox] = useState(false);
  const [newDesc, setNewDesc] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AccountType>("cash");
  const [editBalance, setEditBalance] = useState("0");
  const [editCreditLimit, setEditCreditLimit] = useState("");
  const [editBillingDay, setEditBillingDay] = useState("");
  const [editTotalLoan, setEditTotalLoan] = useState("");
  const [editLoanTerms, setEditLoanTerms] = useState("");
  const [editInterestRate, setEditInterestRate] = useState("");
  const [editIsCoinBox, setEditIsCoinBox] = useState(false);
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadAccounts = useCallback(async () => {
    if (!supabase) { setState({ status: "failure", message: "Runtime 設定不完整" }); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { setState({ status: "failure", message: "請先登入" }); return; }

    const { data, error } = await supabase
      .from("finance_accounts")
      .select("id,display_name,account_type,initial_balance,credit_limit,billing_day,total_loan,loan_term_months,interest_rate,description,is_coin_box,is_active")
      .order("display_name", { ascending: true })
      .limit(200);

    if (error) { setState({ status: "failure", message: "讀取帳戶失敗" }); return; }
    setState({ status: "success", items: (data ?? []) as AccountRow[] });
  }, [supabase]);

  useEffect(() => { void loadAccounts(); }, [loadAccounts]);

  // --- Helpers ---
  function resetNewForm() {
    setNewName("");
    setNewType("cash");
    setNewBalance("0");
    setNewCreditLimit("");
    setNewBillingDay("");
    setNewTotalLoan("");
    setNewLoanTerms("");
    setNewInterestRate("");
    setNewIsCoinBox(false);
    setNewDesc("");
  }

  function clearNewCreditLoanFields() {
    setNewCreditLimit("");
    setNewBillingDay("");
    setNewTotalLoan("");
    setNewLoanTerms("");
    setNewInterestRate("");
  }

  function clearEditCreditLoanFields() {
    setEditCreditLimit("");
    setEditBillingDay("");
    setEditTotalLoan("");
    setEditLoanTerms("");
    setEditInterestRate("");
  }

  function handleNewTypeChange(nextType: AccountType) {
    setNewType(nextType);
    if (nextType !== "cash") setNewIsCoinBox(false);
  }

  function handleEditTypeChange(nextType: AccountType) {
    setEditType(nextType);
    if (nextType !== "cash") setEditIsCoinBox(false);
  }

  function handleNewCoinBoxChange(nextValue: boolean) {
    setNewIsCoinBox(nextValue);
    if (nextValue) clearNewCreditLoanFields();
  }

  function handleEditCoinBoxChange(nextValue: boolean) {
    setEditIsCoinBox(nextValue);
    if (nextValue) clearEditCreditLoanFields();
  }

  // --- Add ---
  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !newName.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) { setToast("請先登入"); return; }

    const body: Record<string, unknown> = {
      user_id: session.user.id,
      display_name: newName.trim(),
      account_type: newType,
      initial_balance: parseInt(newBalance, 10) || 0,
    };
    if (newType === "cash" && newIsCoinBox) {
      body.is_coin_box = true;
    }

    if (newType === "credit_card") {
      body.credit_limit = parseInt(newCreditLimit, 10) || null;
      body.billing_day = newBillingDay ? parseInt(newBillingDay, 10) : null;
    }
    if (newType === "stored_value") {
      body.total_loan = parseInt(newTotalLoan, 10) || null;
      body.loan_term_months = parseInt(newLoanTerms, 10) || null;
      body.interest_rate = newInterestRate ? parseFloat(newInterestRate) : null;
    }
    if (newDesc.trim()) body.description = newDesc.trim();

    try {
      const response = await fetch(
        `${runtimeConfig.supabaseUrl}/rest/v1/finance_accounts`,
        {
          method: "POST",
          headers: {
            apikey: runtimeConfig.publishableKey,
            authorization: `Bearer ${session.access_token}`,
            "content-type": "application/json",
            prefer: "return=minimal",
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        setToast(`新增失敗 (${response.status}): ${text}`);
        return;
      }
    } catch (err) {
      setToast(`新增失敗: ${err}`);
      return;
    }

    resetNewForm();
    setToast("✅ 帳戶已新增");
    await loadAccounts();
  }

  // --- Edit ---
  function startEdit(acct: AccountRow) {
    setEditingId(acct.id);
    setEditName(acct.display_name);
    setEditType(acct.account_type);
    setEditBalance(String(acct.initial_balance));
    setEditCreditLimit(acct.credit_limit != null ? String(acct.credit_limit) : "");
    setEditBillingDay(acct.billing_day != null ? String(acct.billing_day) : "");
    setEditTotalLoan(acct.total_loan != null ? String(acct.total_loan) : "");
    setEditLoanTerms(acct.loan_term_months != null ? String(acct.loan_term_months) : "");
    setEditInterestRate(acct.interest_rate != null ? String(acct.interest_rate) : "");
    setEditIsCoinBox(acct.is_coin_box);
    setEditDesc(acct.description ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function handleUpdate(id: string) {
    if (!supabase || !editName.trim()) return;

    const updates: Record<string, unknown> = {
      display_name: editName.trim(),
      account_type: editType,
      initial_balance: parseInt(editBalance, 10) || 0,
      is_coin_box: editType === "cash" && editIsCoinBox,
    };

    if (editType === "credit_card") {
      updates.credit_limit = parseInt(editCreditLimit, 10) || null;
      updates.billing_day = editBillingDay ? parseInt(editBillingDay, 10) : null;
    } else {
      updates.credit_limit = null;
      updates.billing_day = null;
    }

    if (editType === "stored_value") {
      updates.total_loan = parseInt(editTotalLoan, 10) || null;
      updates.loan_term_months = parseInt(editLoanTerms, 10) || null;
      updates.interest_rate = editInterestRate ? parseFloat(editInterestRate) : null;
    } else {
      updates.total_loan = null;
      updates.loan_term_months = null;
      updates.interest_rate = null;
    }

    updates.description = editDesc.trim() || null;

    const { error } = await supabase.from("finance_accounts").update(updates).eq("id", id);
    if (error) { setToast(`更新失敗: ${error.message}`); return; }

    setEditingId(null);
    setToast("✅ 帳戶已更新");
    await loadAccounts();
  }

  // --- Toggle active ---
  async function handleToggleActive(id: string, current: boolean) {
    if (!supabase) return;
    const { error } = await supabase.from("finance_accounts").update({ is_active: !current }).eq("id", id);
    if (error) { setToast(`更新失敗: ${error.message}`); return; }
    setToast(current ? "⏸ 已停用" : "▶️ 已啟用");
    await loadAccounts();
  }

  // --- Render helpers ---
  function renderConditionalFields(type: AccountType, prefix: "new" | "edit") {
    const fields: React.ReactNode[] = [];

    if (type === "credit_card") {
      const val = prefix === "new" ? newCreditLimit : editCreditLimit;
      const setVal = prefix === "new" ? setNewCreditLimit : setEditCreditLimit;
      fields.push(
        <div className="field" key="credit_limit">
          <span>信用額度</span>
          <input type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder="例：50000" />
        </div>,
      );
      const dayVal = prefix === "new" ? newBillingDay : editBillingDay;
      const setDay = prefix === "new" ? setNewBillingDay : setEditBillingDay;
      fields.push(
        <div className="field" key="billing_day">
          <span>帳單日 (1-31)</span>
          <input type="number" min={1} max={31} value={dayVal} onChange={(e) => setDay(e.target.value)} placeholder="例：15" />
        </div>,
      );
    }

    if (type === "stored_value") {
      const loanVal = prefix === "new" ? newTotalLoan : editTotalLoan;
      const setLoan = prefix === "new" ? setNewTotalLoan : setEditTotalLoan;
      fields.push(
        <div className="field" key="total_loan">
          <span>貸款總額</span>
          <input type="number" value={loanVal} onChange={(e) => setLoan(e.target.value)} placeholder="例：500000" />
        </div>,
      );
      const termVal = prefix === "new" ? newLoanTerms : editLoanTerms;
      const setTerm = prefix === "new" ? setNewLoanTerms : setEditLoanTerms;
      fields.push(
        <div className="field" key="loan_terms">
          <span>期數 (月)</span>
          <input type="number" value={termVal} onChange={(e) => setTerm(e.target.value)} placeholder="例：60" />
        </div>,
      );
      const rateVal = prefix === "new" ? newInterestRate : editInterestRate;
      const setRate = prefix === "new" ? setNewInterestRate : setEditInterestRate;
      fields.push(
        <div className="field" key="interest_rate">
          <span>利率 (%)</span>
          <input type="number" step="0.01" value={rateVal} onChange={(e) => setRate(e.target.value)} placeholder="例：2.5" />
        </div>,
      );
    }

    return fields;
  }

  function renderCoinBoxToggle(prefix: "new" | "edit") {
    const enabled = prefix === "new" ? newIsCoinBox : editIsCoinBox;
    const onChange = prefix === "new" ? handleNewCoinBoxChange : handleEditCoinBoxChange;

    return (
      <div className="coin-box-toggle">
        <div className="coin-box-copy">
          <strong>🪙 零錢盒</strong>
          <span>提醒式儲蓄，不自動影響帳戶餘額；年末可提醒結算轉帳。</span>
        </div>
        <label className="coin-box-switch">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onChange(e.target.checked)}
            aria-label="啟用零錢盒模式"
          />
          <span className="coin-box-slider" aria-hidden="true" />
          <span className="coin-box-switch-text">啟用</span>
        </label>
      </div>
    );
  }

  function renderAccountRow(acct: AccountRow) {
    const isEditing = editingId === acct.id;

    if (isEditing) {
      return (
        <div className="category-edit-form" key={acct.id}>
          <div className="field">
            <span>名稱</span>
            <input className="category-edit-input" type="text" value={editName}
              onChange={(e) => setEditName(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <span>類型</span>
            <select value={editType} onChange={(e) => handleEditTypeChange(e.target.value as AccountType)}>
              {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <span>初始餘額</span>
            <input type="number" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} placeholder="例如：100000" />
          </div>
          {editType === "cash" && renderCoinBoxToggle("edit")}
          {renderConditionalFields(editType, "edit")}
          <div className="field">
            <span>描述（選填）</span>
            <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="備註..." />
          </div>
          <div className="category-edit-actions">
            <button className="submit-button" onClick={() => handleUpdate(acct.id)} type="button">儲存</button>
            <button className="secondary-button" onClick={cancelEdit} type="button">取消</button>
          </div>
        </div>
      );
    }

    return (
      <div className={`category-row ${!acct.is_active ? "category-row--inactive" : ""}`} key={acct.id}>
        <div className="category-row-info">
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <strong className="category-name">{acct.display_name}</strong>
            <span className="acct-type-badge">{ACCOUNT_TYPE_BADGES[acct.account_type]}</span>
            {acct.is_coin_box && <span className="coin-badge">🪙 零錢盒</span>}
            {!acct.is_active && <span className="category-badge-inactive">已停用</span>}
          </div>
          <div className="acct-meta" style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 4 }}>
            <span>初始餘額：TWD {acct.initial_balance.toLocaleString()}</span>
            {acct.account_type === "credit_card" && acct.credit_limit != null && (
              <span> · 額度：TWD {acct.credit_limit.toLocaleString()}</span>
            )}
            {acct.account_type === "credit_card" && acct.billing_day != null && (
              <span> · 帳單日：{acct.billing_day} 日</span>
            )}
            {acct.account_type === "stored_value" && acct.total_loan != null && (
              <span> · 貸款總額：TWD {acct.total_loan.toLocaleString()}</span>
            )}
            {acct.account_type === "stored_value" && acct.loan_term_months != null && (
              <span> · {acct.loan_term_months} 期</span>
            )}
            {acct.account_type === "stored_value" && acct.interest_rate != null && (
              <span> · 利率 {acct.interest_rate}%</span>
            )}
            {acct.description && <span> · {acct.description}</span>}
          </div>
        </div>
        <div className="category-row-actions">
          <button className="secondary-button category-action-btn" onClick={() => startEdit(acct)} type="button">編輯</button>
          <button
            className={`secondary-button category-action-btn ${acct.is_active ? "btn-warning" : "btn-success"}`}
            onClick={() => handleToggleActive(acct.id, acct.is_active)}
            type="button"
          >
            {acct.is_active ? "停用" : "啟用"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-header" style={{ marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", color: "#e2e8f0" }}>🏦 帳戶管理</h3>
          <p className="summary" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>
            管理你的現金、銀行帳戶、信用卡與貸款
          </p>
        </div>
      </div>

      {toast ? <p className="toast-message">{toast}</p> : null}

      {state.status === "failure" ? (
        <p className="status-message status-error" role="alert">{state.message}</p>
      ) : state.status === "loading" ? (
        <p className="status-message" role="status">載入中...</p>
      ) : (
        <>
          {/* Add new account form */}
          <form onSubmit={handleAdd} className="category-add-form" style={{ marginBottom: 16 }}>
            <div className="field">
              <span>帳戶名稱</span>
              <input type="text" value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如：玉山銀行、台新信用卡、車貸" required />
            </div>
            <div className="field">
              <span>帳戶類型</span>
              <select value={newType} onChange={(e) => handleNewTypeChange(e.target.value as AccountType)}>
                {ACCOUNT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <span>初始餘額</span>
              <input type="number" value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="例如：100000" />
            </div>
            {newType === "cash" && renderCoinBoxToggle("new")}
            {renderConditionalFields(newType, "new")}
            <div className="field">
              <span>描述（選填）</span>
              <input type="text" value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="備註..." />
            </div>
            <button className="submit-button" type="submit">新增帳戶</button>
          </form>

          {/* Account list */}
          <div className="category-list">
            {state.items.length === 0 ? (
              <p className="status-message status-muted">尚無帳戶，請新增</p>
            ) : (
              state.items.map((acct) => renderAccountRow(acct))
            )}
          </div>
        </>
      )}
    </div>
  );
}
