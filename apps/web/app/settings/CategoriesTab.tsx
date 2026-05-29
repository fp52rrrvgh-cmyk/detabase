"use client";

import { createClient } from "@supabase/supabase-js";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runtimeConfig } from "../constants";

// --- Types ---
type CategoryRow = {
  id: string;
  display_name: string;
  grouping_purpose: string | null;
  parent_id: string | null;
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
  const [editParent, setEditParent] = useState("");
  const [newName, setNewName] = useState("");
  const [newPurpose, setNewPurpose] = useState("");
  const [newParent, setNewParent] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());

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
      .select("id,display_name,grouping_purpose,parent_id,is_active")
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
            parent_id: newParent || null,
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
    setNewParent("");
    setToast("✅ 分類已新增");
    await loadCategories();
  }

  async function handleUpdate(id: string) {
    if (!supabase || !editName.trim()) return;
    const updates: Record<string, unknown> = { display_name: editName.trim() };
    updates.parent_id = editParent || null;
    const { error } = await supabase.from("finance_categories").update(updates).eq("id", id);
    if (error) { setToast(`更新失敗: ${error.message}`); return; }
    setEditingId(null);
    setEditName("");
    setEditParent("");
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

  function renderCategoryRow(cat: CategoryRow, depth: number) {
    if (editingId === cat.id) {
      return (
        <div className="category-edit-form">
          <input className="category-edit-input" type="text" value={editName}
            onChange={(e) => setEditName(e.target.value)} autoFocus />
          <CategoryTreePicker
            items={state.status === "success" ? state.items : []}
            value={editParent}
            excludeId={cat.id}
            onChange={setEditParent}
            placeholder="無（頂層分類）"
          />
          <div className="category-edit-actions">
            <button className="submit-button" onClick={() => handleUpdate(cat.id)} type="button">儲存</button>
            <button className="secondary-button" onClick={() => { setEditingId(null); setEditParent(""); }} type="button">取消</button>
          </div>
        </div>
      );
    }

    const childMap = buildChildMap();
    const hasChildren = childMap.has(cat.id) && (childMap.get(cat.id)?.length ?? 0) > 0;
    const isCollapsed = collapsedParents.has(cat.id);

    return (
      <div className={`category-row ${!cat.is_active ? "category-row--inactive" : ""}`} style={{ paddingLeft: depth * 16 }}>
        <div className={`category-row-info ${hasChildren ? "category-row-info-clickable" : ""}`}
          onClick={hasChildren ? () => toggleCollapse(cat.id) : undefined}>
          {hasChildren && (
            <span className="category-collapse-btn">
              {isCollapsed ? "▸" : "▾"}
            </span>
          )}
          {!hasChildren && depth > 0 && <span className="category-child-indent">└ </span>}
          <strong className="category-name">{cat.display_name}</strong>
          {cat.grouping_purpose ? <span className="category-purpose">{cat.grouping_purpose}</span> : null}
          {!cat.is_active ? <span className="category-badge-inactive">已停用</span> : null}
        </div>
        <div className="category-row-actions">
          <button className="secondary-button category-action-btn" onClick={() => {
            setEditingId(cat.id);
            setEditName(cat.display_name);
            setEditParent(cat.parent_id ?? "");
          }} type="button">編輯</button>
          <button className={`secondary-button category-action-btn ${cat.is_active ? "btn-warning" : "btn-success"}`}
            onClick={() => handleToggleActive(cat.id, cat.is_active)} type="button">
            {cat.is_active ? "停用" : "啟用"}
          </button>
        </div>
      </div>
    );
  }

  function toggleCollapse(id: string) {
    setCollapsedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Build a parent→children map from flat items */
  function buildChildMap() {
    const map = new Map<string | "root", CategoryRow[]>();
    for (const c of state.status === "success" ? state.items : []) {
      const key = c.parent_id ?? "root";
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }

  /** Recursively render a category and its descendants */
  function renderCategoryTree(parentId: string | null, depth: number): React.ReactNode[] {
    const childMap = buildChildMap();
    const key = parentId ?? "root";
    const children = childMap.get(key) ?? [];
    return children.flatMap((cat) => {
      const isCollapsed = collapsedParents.has(cat.id);
      const hasChildren = childMap.has(cat.id) && (childMap.get(cat.id)?.length ?? 0) > 0;
      return [
        <React.Fragment key={cat.id}>
          {renderCategoryRow(cat, depth)}
          {hasChildren && !isCollapsed && renderCategoryTree(cat.id, depth + 1)}
        </React.Fragment>,
      ];
    });
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
            <div className="field">
              <span>母分類（選填）</span>
              <CategoryTreePicker
                items={state.status === "success" ? state.items : []}
                value={newParent}
                excludeId=""
                onChange={setNewParent}
                placeholder="無（頂層分類）"
              />
            </div>
            <button className="submit-button" type="submit">新增分類</button>
          </form>

          {/* Category list */}
          <div className="category-list">
            {state.items.length === 0 ? (
              <p className="status-message status-muted">尚無分類，請新增</p>
            ) : (
              renderCategoryTree(null, 0)
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Tree Category Picker (with search) ──

function CategoryTreePicker({
  items,
  value,
  excludeId,
  onChange,
  placeholder,
}: {
  items: CategoryRow[];
  value: string;
  excludeId: string;
  onChange: (id: string) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedLabel =
    value
      ? items.find((c) => c.id === value)?.display_name ?? placeholder
      : placeholder;

  // Build tree
  const childMap = new Map<string | "root", CategoryRow[]>();
  for (const c of items) {
    const key = c.parent_id ?? "root";
    const arr = childMap.get(key) ?? [];
    arr.push(c);
    childMap.set(key, arr);
  }

  // Gather all reachable paths for a node (for search matching)
  function getAllDescendantIds(parentId: string): string[] {
    const kids = childMap.get(parentId) ?? [];
    return kids.flatMap((k) => [k.id, ...getAllDescendantIds(k.id)]);
  }

  // When searching, auto-expand all matching paths
  const searchActive = search.trim().length > 0;
  const searchLower = search.trim().toLowerCase();
  const matchedIds = searchActive
    ? new Set(
        items
          .filter(
            (c) =>
              c.id !== excludeId &&
              c.display_name.toLowerCase().includes(searchLower)
          )
          .flatMap((c) => [c.id, ...getAllDescendantIds(c.id)])
      )
    : null;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isExpanded = (id: string) =>
    searchActive ? true : expanded.has(id);

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
    setSearch("");
  };

  function renderNodes(
    parentId: string | null,
    depth: number
  ): React.ReactNode[] {
    const key = parentId ?? "root";
    const children = childMap.get(key) ?? [];
    return children.flatMap((cat) => {
      if (cat.id === excludeId) return [];

      const hasChildren =
        childMap.has(cat.id) && (childMap.get(cat.id)?.length ?? 0) > 0;

      // If search active and this node doesn't match, skip
      if (searchActive && !matchedIds?.has(cat.id)) return [];

      const showExpanded = isExpanded(cat.id);
      const sel = value === cat.id;

      return [
        <button
          key={cat.id}
          type="button"
          className={`qc-tree-item ${sel ? "qc-tree-item-selected" : ""} ${
            hasChildren ? "qc-tree-item-parent" : "qc-tree-item-leaf"
          }`}
          style={{ paddingLeft: 12 + depth * 16 }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(cat.id);
            } else {
              select(cat.id);
            }
          }}
        >
          {hasChildren ? (
            <span className="qc-tree-arrow">
              {showExpanded ? "▾" : "▸"}
            </span>
          ) : (
            <span className="qc-tree-dot">·</span>
          )}
          <span className="qc-tree-label">{cat.display_name}</span>
          {sel && <span className="qc-tree-check">✓</span>}
        </button>,
        ...(hasChildren && showExpanded
          ? renderNodes(cat.id, depth + 1)
          : []),
      ];
    });
  }

  return (
    <div className="qc-tree-wrapper" ref={ref}>
      <button
        type="button"
        className={`qc-tree-trigger ${open ? "qc-tree-trigger-open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <span
          className={`qc-tree-trigger-label ${
            !value ? "qc-tree-placeholder" : ""
          }`}
        >
          {selectedLabel}
        </span>
        <span className="qc-tree-trigger-arrow">
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open && (
        <div className="qc-tree-dropdown">
          {/* Search input */}
          <div className="qc-tree-search-wrap">
            <input
              type="text"
              className="qc-tree-search"
              placeholder="搜尋分類..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          {/* None option */}
          <button
            type="button"
            className={`qc-tree-item qc-tree-item-leaf ${
              !value ? "qc-tree-item-selected" : ""
            }`}
            style={{ paddingLeft: 12 }}
            onClick={() => select("")}
          >
            <span className="qc-tree-dot">·</span>
            <span className="qc-tree-label">{placeholder}</span>
            {!value && <span className="qc-tree-check">✓</span>}
          </button>
          {renderNodes(null, 0)}
        </div>
      )}
    </div>
  );
}
