"use client";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { runtimeConfig } from "../constants";

// --- Types ---
type CategoryRow = {
  id: string;
  display_name: string;
  grouping_purpose: string | null;
  is_active: boolean;
};

type PageState =
  | { status: "loading" }
  | { status: "success"; items: CategoryRow[] }
  | { status: "failure"; message: string };

// --- Component ---
export function CategoriesTab() {
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const [state, setState] = useState<PageState>({ status: "loading" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [newName, setNewName] = useState("");
  const [newPurpose, setNewPurpose] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const loadCategories = useCallback(async () => {
    if (!supabase) { setState({ status: "failure", message: "Runtime 設定不完整" }); return; }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { setState({ status: "failure", message: "請先登入" }); return; }

    const { data, error } = await supabase
      .from("finance_categories")
      .select("id,display_name,grouping_purpose,is_active")
      .order("display_name", { ascending: true })
      .limit(500);

    if (error) { setState({ status: "failure", message: "讀取分類失敗" }); return; }
    setState({ status: "success", items: (data ?? []) as CategoryRow[] });
  }, [supabase]);

  useEffect(() => { void loadCategories(); }, [loadCategories]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !newName.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) { setToast("請先登入"); return; }

    try {
      const response = await fetch(
        `${runtimeConfig.supabaseUrl}/rest/v1/finance_categories`,
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
            display_name: newName.trim(),
            grouping_purpose: newPurpose.trim() || null,
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

    setNewName("");
    setNewPurpose("");
    setToast("✅ 分類已新增");
    await loadCategories();
  }

  async function handleUpdate(id: string) {
    if (!supabase || !editName.trim()) return;
    const { error } = await supabase.from("finance_categories").update({ display_name: editName.trim() }).eq("id", id);
    if (error) { setToast(`更新失敗: ${error.message}`); return; }
    setEditingId(null);
    setEditName("");
    setToast("✅ 分類已更新");
    await loadCategories();
  }

  async function handleToggleActive(id: string, current: boolean) {
    if (!supabase) return;
    const { error } = await supabase.from("finance_categories").update({ is_active: !current }).eq("id", id);
    if (error) { setToast(`更新失敗: ${error.message}`); return; }
    setToast(current ? "✅ 已停用" : "✅ 已啟用");
    await loadCategories();
  }

  return (
    <div>
      <div className="d-header" style={{ marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", color: "#e2e8f0" }}>🏷️ 分類管理</h3>
          <p className="summary" style={{ fontSize: "0.8rem", margin: "4px 0 0" }}>
            管理你的支出/收入分類
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
          {/* Add new category */}
          <form onSubmit={handleAdd} className="category-add-form" style={{ marginBottom: 16 }}>
            <div className="field">
              <span>分類名稱</span>
              <input type="text" value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例如：香菸、加油、車貸" required />
            </div>
            <div className="field">
              <span>分組（選填）</span>
              <select value={newPurpose} onChange={(e) => setNewPurpose(e.target.value)}>
                <option value="">不分組</option>
                <option value="expense">支出</option>
                <option value="income">收入</option>
              </select>
            </div>
            <button className="submit-button" type="submit">新增分類</button>
          </form>

          {/* Category list */}
          <div className="category-list">
            {state.items.length === 0 ? (
              <p className="status-message status-muted">尚無分類，請新增</p>
            ) : (
              state.items.map((cat) => (
                <div key={cat.id} className={`category-row ${!cat.is_active ? "category-row--inactive" : ""}`}>
                  {editingId === cat.id ? (
                    <div className="category-edit-form">
                      <input className="category-edit-input" type="text" value={editName}
                        onChange={(e) => setEditName(e.target.value)} autoFocus />
                      <div className="category-edit-actions">
                        <button className="submit-button" onClick={() => handleUpdate(cat.id)} type="button">儲存</button>
                        <button className="secondary-button" onClick={() => setEditingId(null)} type="button">取消</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="category-row-info">
                        <strong className="category-name">{cat.display_name}</strong>
                        {cat.grouping_purpose ? <span className="category-purpose">{cat.grouping_purpose}</span> : null}
                        {!cat.is_active ? <span className="category-badge-inactive">已停用</span> : null}
                      </div>
                      <div className="category-row-actions">
                        <button className="secondary-button category-action-btn" onClick={() => { setEditingId(cat.id); setEditName(cat.display_name); }} type="button">編輯</button>
                        <button className={`secondary-button category-action-btn ${cat.is_active ? "btn-warning" : "btn-success"}`}
                          onClick={() => handleToggleActive(cat.id, cat.is_active)} type="button">
                          {cat.is_active ? "停用" : "啟用"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
