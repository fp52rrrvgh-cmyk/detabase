"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { runtimeConfig } from "../constants";

// --- Types ---
type RuleRow = {
  id: string;
  keyword: string;
  category_id: string | null;
  account_id: string | null;
  movement_type: string | null;
  is_enabled: boolean;
  created_at: string;
};

type CategoryRow = {
  id: string;
  display_name: string;
  grouping_purpose: string | null;
  parent_id: string | null;
};

type AccountRow = {
  id: string;
  display_name: string;
  account_type: string;
};

type PageState =
  | { status: "loading" }
  | { status: "success"; rules: RuleRow[]; categories: CategoryRow[]; accounts: AccountRow[] }
  | { status: "failure"; message: string };

const MOVEMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "不限" },
  { value: "expense", label: "支出" },
  { value: "income", label: "收入" },
];

// --- Component ---
export function RulesTab() {
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const [state, setState] = useState<PageState>({ status: "loading" });
  const [toast, setToast] = useState<string | null>(null);

  // New rule form
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newAccountId, setNewAccountId] = useState("");
  const [newMovement, setNewMovement] = useState("");

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editAccountId, setEditAccountId] = useState("");
  const [editMovement, setEditMovement] = useState("");

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadRules = useCallback(async () => {
    if (!supabase) { setState({ status: "failure", message: "Runtime 設定不完整" }); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { setState({ status: "failure", message: "請先登入" }); return; }

    const [rulesResult, categoriesResult, accountsResult] = await Promise.all([
      supabase
        .from("finance_classification_rules")
        .select("id,keyword,category_id,account_id,movement_type,is_enabled,created_at")
        .order("keyword", { ascending: true })
        .limit(500),
      supabase
        .from("finance_categories")
        .select("id,display_name,grouping_purpose,parent_id")
        .order("display_name", { ascending: true })
        .limit(500),
      supabase
        .from("finance_accounts")
        .select("id,display_name,account_type")
        .order("display_name", { ascending: true })
        .limit(200),
    ]);

    if (rulesResult.error) {
      setState({ status: "failure", message: "讀取規則失敗" });
      return;
    }
    setState({
      status: "success",
      rules: (rulesResult.data ?? []) as RuleRow[],
      categories: (categoriesResult.data ?? []) as CategoryRow[],
      accounts: (accountsResult.data ?? []) as AccountRow[],
    });
  }, [supabase]);

  useEffect(() => { void loadRules(); }, [loadRules]);

  // --- Add rule ---
  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !newKeyword.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) { setToast("請先登入"); return; }

    try {
      const response = await fetch(
        `${runtimeConfig.supabaseUrl}/rest/v1/finance_classification_rules`,
        {
          method: "POST",
          headers: {
            apikey: runtimeConfig.publishableKey,
            authorization: `Bearer ${session.access_token}`,
            "content-type": "application/json",
            prefer: "return=minimal",
          },
          body: JSON.stringify({
            user_id: session.user.id,
            keyword: newKeyword.trim(),
            category_id: newCategoryId || null,
            account_id: newAccountId || null,
            movement_type: newMovement || null,
          }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        setToast(`新增失敗 (${response.status}): ${body}`);
        return;
      }
    } catch (err) {
      setToast(`新增失敗: ${err}`);
      return;
    }

    setNewKeyword("");
    setNewCategoryId("");
    setNewAccountId("");
    setNewMovement("");
    setToast("✅ 規則已新增");
    await loadRules();
  }

  // --- Update rule ---
  async function handleUpdate(id: string) {
    if (!supabase || !editKeyword.trim()) return;

    const updates: Record<string, unknown> = {
      keyword: editKeyword.trim(),
      category_id: editCategoryId || null,
      account_id: editAccountId || null,
      movement_type: editMovement || null,
    };

    const { error } = await supabase.from("finance_classification_rules").update(updates).eq("id", id);
    if (error) { setToast(`更新失敗: ${error.message}`); return; }

    setEditingId(null);
    setEditKeyword("");
    setEditCategoryId("");
    setEditAccountId("");
    setEditMovement("");
    setToast("✅ 規則已更新");
    await loadRules();
  }

  // --- Delete rule ---
  async function handleDelete(id: string) {
    if (!supabase) return;
    const { error } = await supabase.from("finance_classification_rules").delete().eq("id", id);
    if (error) { setToast(`刪除失敗: ${error.message}`); return; }
    setDeleteConfirmId(null);
    setToast("🗑️ 規則已刪除");
    await loadRules();
  }

  // --- Toggle enabled ---
  async function handleToggleEnabled(id: string, current: boolean) {
    if (!supabase) return;
    const { error } = await supabase.from("finance_classification_rules").update({ is_enabled: !current }).eq("id", id);
    if (error) { setToast(`更新失敗: ${error.message}`); return; }
    setToast(current ? "⏸ 已停用" : "▶️ 已啟用");
    await loadRules();
  }

  // --- Helpers ---
  function getCategoryName(id: string | null): string {
    if (!id || state.status !== "success") return "";
    return state.categories.find((c) => c.id === id)?.display_name ?? "";
  }

  function getAccountName(id: string | null): string {
    if (!id || state.status !== "success") return "";
    return state.accounts.find((a) => a.id === id)?.display_name ?? "";
  }

  function getMovementLabel(val: string | null): string {
    if (!val) return "";
    return val === "expense" ? "支出" : "收入";
  }

  function resetNewForm() {
    setNewKeyword("");
    setNewCategoryId("");
    setNewAccountId("");
    setNewMovement("");
  }

  function startEdit(rule: RuleRow) {
    setEditingId(rule.id);
    setEditKeyword(rule.keyword);
    setEditCategoryId(rule.category_id ?? "");
    setEditAccountId(rule.account_id ?? "");
    setEditMovement(rule.movement_type ?? "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditKeyword("");
    setEditCategoryId("");
    setEditAccountId("");
    setEditMovement("");
  }

  // --- Render ---
  const categories = state.status === "success" ? state.categories : [];
  const accounts = state.status === "success" ? state.accounts : [];
  const rules = state.status === "success" ? state.rules : [];

  function renderRuleRow(rule: RuleRow) {
    const isEditing = editingId === rule.id;

    if (isEditing) {
      return (
        <div className="rule-edit-form" key={rule.id}>
          <div className="field compact-field">
            <span>關鍵字</span>
            <input type="text" value={editKeyword}
              onChange={(e) => setEditKeyword(e.target.value)} autoFocus />
          </div>
          <div className="field compact-field">
            <span>分類</span>
            <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)}>
              <option value="">不分類</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.display_name}</option>
              ))}
            </select>
          </div>
          <div className="field compact-field">
            <span>帳戶</span>
            <select value={editAccountId} onChange={(e) => setEditAccountId(e.target.value)}>
              <option value="">不指定</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.display_name}</option>
              ))}
            </select>
          </div>
          <div className="field compact-field">
            <span>類型</span>
            <select value={editMovement} onChange={(e) => setEditMovement(e.target.value)}>
              {MOVEMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="rule-edit-actions">
            <button className="submit-button" style={{ minHeight: 40, padding: "0 14px", width: "auto", fontSize: "0.82rem" }}
              onClick={() => handleUpdate(rule.id)} type="button">儲存</button>
            <button className="secondary-button" style={{ minHeight: 40, padding: "0 14px", width: "auto", fontSize: "0.82rem" }}
              onClick={cancelEdit} type="button">取消</button>
          </div>
        </div>
      );
    }

    const isDeleting = deleteConfirmId === rule.id;

    if (isDeleting) {
      return (
        <div className="rule-row rule-row--deleting" key={rule.id}>
          <span className="rule-confirm-text">確定刪除此規則？</span>
          <div className="rule-confirm-actions">
            <button className="st-btn st-btn-sm st-btn-danger" onClick={() => handleDelete(rule.id)} type="button">確認刪除</button>
            <button className="secondary-button category-action-btn" onClick={() => setDeleteConfirmId(null)} type="button">取消</button>
          </div>
        </div>
      );
    }

    return (
      <div className={`rule-row ${!rule.is_enabled ? "rule-row--inactive" : ""}`} key={rule.id}>
        <div className="rule-row-info">
          <div className="rule-row-main">
            <strong className="rule-keyword">{rule.keyword}</strong>
            <span className="rule-meta-sep">→</span>
            {rule.category_id ? (
              <span className="rule-tag rule-tag-category">{getCategoryName(rule.category_id)}</span>
            ) : null}
            {rule.account_id ? (
              <span className="rule-tag rule-tag-account">{getAccountName(rule.account_id)}</span>
            ) : null}
            {rule.movement_type ? (
              <span className="rule-tag rule-tag-movement">{getMovementLabel(rule.movement_type)}</span>
            ) : null}
            {!rule.category_id && !rule.account_id && !rule.movement_type ? (
              <span className="rule-no-target">無對應設定</span>
            ) : null}
            {!rule.is_enabled ? <span className="category-badge-inactive">已停用</span> : null}
          </div>
        </div>
        <div className="rule-row-actions">
          <button
            className={`rule-toggle-btn ${rule.is_enabled ? "rule-toggle-on" : "rule-toggle-off"}`}
            onClick={() => handleToggleEnabled(rule.id, rule.is_enabled)}
            type="button"
            title={rule.is_enabled ? "停用" : "啟用"}
          >
            {rule.is_enabled ? "⏸" : "▶️"}
          </button>
          <button className="secondary-button category-action-btn" onClick={() => startEdit(rule)} type="button">編輯</button>
          <button className="secondary-button category-action-btn rule-delete-btn" onClick={() => setDeleteConfirmId(rule.id)} type="button">刪除</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-header" style={{ marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", color: "#e2e8f0" }}>📋 規則分類</h3>
          <p className="summary" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>
            設定關鍵字自動帶入分類、帳戶與類型
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
          {/* Add new rule form */}
          <form onSubmit={handleAdd} className="rule-add-form" style={{ marginBottom: 16 }}>
            <div className="rule-add-row">
              <div className="field compact-field" style={{ flex: 1, minWidth: 140 }}>
                <span>關鍵字</span>
                <input type="text" value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="例如：中油、全聯、costco" required />
              </div>
              <div className="field compact-field" style={{ flex: 1, minWidth: 120 }}>
                <span>分類</span>
                <select value={newCategoryId} onChange={(e) => setNewCategoryId(e.target.value)}>
                  <option value="">不分類</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.display_name}</option>
                  ))}
                </select>
              </div>
              <div className="field compact-field" style={{ flex: 1, minWidth: 120 }}>
                <span>帳戶</span>
                <select value={newAccountId} onChange={(e) => setNewAccountId(e.target.value)}>
                  <option value="">不指定</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.display_name}</option>
                  ))}
                </select>
              </div>
              <div className="field compact-field" style={{ flex: 0, minWidth: 80 }}>
                <span>類型</span>
                <select value={newMovement} onChange={(e) => setNewMovement(e.target.value)}>
                  {MOVEMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="rule-add-btn-wrap">
                <button className="submit-button" type="submit" style={{ minHeight: 40, padding: "0 16px", fontSize: "0.85rem", width: "auto" }}>
                  新增
                </button>
              </div>
            </div>
          </form>

          {/* Rules list */}
          <div className="rule-list">
            {rules.length === 0 ? (
              <p className="status-message status-muted">尚無規則，請新增</p>
            ) : (
              rules.map((rule) => renderRuleRow(rule))
            )}
          </div>
        </>
      )}
    </div>
  );
}
