"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { FormEvent } from "react";

import type { QuickCaptureMode, SubmitState } from "../../types";

import { quickCaptureModeLabel } from "../../lib/format";

const QUICK_AMOUNTS = [100, 500, 1000, 5000];
const LOCALSTORAGE_KEY = "xiaoma_last_quick_capture";

type LastRecord = {
  categoryId: string;
  accountId: string;
  amount: string;
  description: string;
  mode: QuickCaptureMode;
};

type AccountItem = {
  id: string;
  display_name: string;
  account_type: string;
  initial_balance: number;
};

type CategoryItem = {
  id: string;
  label: string;
  groupingPurpose: string | null;
  parentId: string | null;
};

export type QuickCaptureModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  activityDate: string;
  amount: string;
  authStatus: string;
  coreConfigReady: boolean;
  currentModeConfigReady: boolean;
  description: string;
  mode: QuickCaptureMode;
  submitState: SubmitState;
  categoryId: string;
  categories: CategoryItem[];
  categoryUsage: Record<string, number>;
  accountId: string;
  accounts: AccountItem[];
  onAmountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onModeChange: (mode: QuickCaptureMode) => void;
  onCategoryChange: (id: string) => void;
  onAccountChange: (id: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function QuickCaptureModal({
  open,
  onClose,
  onSuccess,
  activityDate,
  amount,
  authStatus,
  coreConfigReady,
  currentModeConfigReady,
  description,
  mode,
  submitState,
  categoryId,
  categories,
  categoryUsage,
  accountId,
  accounts,
  onAmountChange,
  onDescriptionChange,
  onModeChange,
  onCategoryChange,
  onAccountChange,
  onSubmit,
}: QuickCaptureModalProps) {
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [batchMode, setBatchMode] = useState(false);

  // Focus amount input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => amountInputRef.current?.focus(), 200);
    }
  }, [open]);

  // Auto close on success (only if not batch mode)
  useEffect(() => {
    if (submitState.status === "success") {
      if (batchMode) {
        // Batch mode: only clear amount, keep category and account
        onAmountChange("");
        // Re-focus amount input
        setTimeout(() => amountInputRef.current?.focus(), 100);
        // Reset submit state silently
      } else {
        const timer = setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 800);
        return () => clearTimeout(timer);
      }
    }
  }, [submitState.status, onClose, onSuccess, batchMode, onAmountChange]);

  if (!open) return null;

  const label = quickCaptureModeLabel(mode);

  const handleQuickAmount = (val: number) => {
    onAmountChange(String(val));
  };

  // ── Last record restoration ──
  const lastRecord: LastRecord | null = useMemo(() => {
    try {
      const raw = localStorage.getItem(LOCALSTORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as LastRecord;
    } catch {
      return null;
    }
  }, [open]);

  const canRestoreLast = lastRecord !== null;

  const handleRestoreLastRecord = () => {
    if (!lastRecord) return;
    // Switch mode if needed
    if (lastRecord.mode !== mode) {
      onModeChange(lastRecord.mode);
    }
    onCategoryChange(lastRecord.categoryId);
    onAccountChange(lastRecord.accountId);
    onAmountChange(lastRecord.amount);
    onDescriptionChange(lastRecord.description);
  };

  // ── Save last record on success ──
  useEffect(() => {
    if (submitState.status === "success") {
      try {
        const record: LastRecord = {
          categoryId: categoryId || "none",
          accountId,
          amount: submitState.amount,
          description: submitState.description,
          mode: submitState.movementType,
        };
        localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(record));
      } catch { /* ignore */ }
    }
  }, [submitState, categoryId, accountId]);

  // ── Top 6 recent categories (by mode) ──
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      if (mode === "expense") {
        return c.groupingPurpose === null || c.groupingPurpose === "expense";
      }
      return c.groupingPurpose === "income";
    });
  }, [categories, mode]);

  // Get top 6 by usage frequency (or alphabetically if no usage data)
  const topCategories = useMemo(() => {
    const filtered = [...filteredCategories];
    // Sort by usage count descending, then alphabetically as tiebreaker
    filtered.sort((a, b) => {
      const aCount = categoryUsage[a.id] ?? 0;
      const bCount = categoryUsage[b.id] ?? 0;
      if (aCount !== bCount) return bCount - aCount;
      return a.label.localeCompare(b.label);
    });
    const top6 = filtered.slice(0, 6);
    const selectedInTop6 = categoryId && categoryId !== "none" && top6.some((c) => c.id === categoryId);
    if (categoryId && categoryId !== "none" && !selectedInTop6) {
      const selectedCat = filteredCategories.find((c) => c.id === categoryId);
      if (selectedCat) {
        return [...top6, selectedCat];
      }
    }
    return top6;
  }, [filteredCategories, categoryId, categoryUsage]);

  const [showTree, setShowTree] = useState(false);

  // ── Category emoji helper ──
  const getCategoryEmoji = (cat: CategoryItem): string => {
    if (cat.groupingPurpose === "income") return "💰";
    // Expense categories get a generic emoji
    return "💳";
  };

  // ── Selected category label ──
  const selectedCategoryLabel = useMemo(() => {
    if (!categoryId || categoryId === "none") return "";
    return filteredCategories.find((c) => c.id === categoryId)?.label ?? "";
  }, [categoryId, filteredCategories]);

  return (
    <div className="qc-overlay">
      <div
        className="qc-modal"
        role="dialog"
        aria-modal="true"
        aria-label="快速記帳"
      >
        <div className="qc-modal-header">
          <h3 className="qc-modal-title">快速記帳</h3>
          <div className="qc-header-actions">
            <button
              className={`qc-last-record ${!canRestoreLast ? "qc-last-record-disabled" : ""}`}
              onClick={handleRestoreLastRecord}
              disabled={!canRestoreLast}
              type="button"
              title="還原上次記錄"
            >
              ↻ 上次記錄
            </button>
            <button
              className="qc-modal-close"
              onClick={onClose}
              type="button"
              aria-label="關閉"
            >
              ✕
            </button>
          </div>
        </div>

        <form className="qc-modal-form" onSubmit={onSubmit}>
          {/* Mode toggle */}
          <div
            className="mode-control"
            role="radiogroup"
            aria-label="快速輸入模式"
          >
            <span>記錄類型</span>
            <div className="mode-options">
              {(["expense", "income"] as const).map((m) => (
                <button
                  aria-checked={mode === m}
                  className={`mode-option ${
                    mode === m ? "mode-option-active" : ""
                  }`}
                  disabled={submitState.status === "loading"}
                  key={m}
                  onClick={() => onModeChange(m)}
                  role="radio"
                  type="button"
                >
                  {quickCaptureModeLabel(m)}
                </button>
              ))}
            </div>
          </div>

          {/* Quick amount buttons */}
          <div className="qc-amount-rows">
            <span className="field-label">金額</span>
            <div className="qc-quick-amounts">
              {QUICK_AMOUNTS.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`qc-amt-btn ${
                    amount === String(val) ? "qc-amt-btn-active" : ""
                  }`}
                  onClick={() => handleQuickAmount(val)}
                >
                  {val.toLocaleString()}
                </button>
              ))}
            </div>
            <input
              ref={amountInputRef}
              inputMode="numeric"
              min="1"
              name="amount"
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="自訂金額"
              required
              step="1"
              title="請輸入正整數 TWD 金額。"
              type="number"
              value={amount}
              className="qc-amount-input"
            />
          </div>

          {/* ── Category cards ── */}
          <div className="field">
            <span>分類</span>
            {topCategories.length > 0 && !showTree && (
              <>
                <div className="qc-cat-cards">
                  {topCategories.map((cat) => {
                    const isSelected = categoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        className={`qc-cat-card ${isSelected ? "qc-cat-card-selected" : ""}`}
                        onClick={() => onCategoryChange(isSelected ? "none" : cat.id)}
                      >
                        <span className="qc-cat-card-emoji">{getCategoryEmoji(cat)}</span>
                        <span className="qc-cat-card-name">{cat.label}</span>
                        {isSelected && <span className="qc-cat-card-check">✓</span>}
                      </button>
                    );
                  })}
                </div>
                <button
                  type="button"
                  className="qc-cat-card-more"
                  onClick={() => setShowTree(true)}
                >
                  更多分類 ▾
                </button>
              </>
            )}
            {showTree && (
              <>
                <CategoryTreeSelect
                  categories={categories}
                  mode={mode}
                  value={categoryId}
                  onChange={(id) => {
                    onCategoryChange(id);
                    setShowTree(false);
                  }}
                />
                {topCategories.length > 0 && (
                  <button
                    type="button"
                    className="qc-cat-card-more"
                    onClick={() => setShowTree(false)}
                  >
                    分類卡片 ▴
                  </button>
                )}
              </>
            )}
          </div>

          {/* ── Account selector ── */}
          <div className="field">
            <span>帳戶</span>
            <AccountSelect
              accounts={accounts}
              value={accountId}
              onChange={onAccountChange}
              mode={mode}
            />
          </div>

          {/* Description (optional) */}
          <label className="field">
            <span>備註（選填）</span>
            <textarea
              name="description"
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder={`簡短${label}備註`}
              rows={2}
              value={description}
            />
          </label>

          {/* Submit info */}
          <div className="fixed-details" aria-label="提交明細">
            <span>{label}</span>
            <span>TWD</span>
            <span>{activityDate || "本機目前日期"}</span>
          </div>

          {/* Submit row */}
          <div className="qc-submit-row">
            <label className="qc-batch-toggle">
              <input
                type="checkbox"
                checked={batchMode}
                onChange={(e) => setBatchMode(e.target.checked)}
              />
              <span className="qc-batch-toggle-label">繼續新增</span>
            </label>
            <button
              className="submit-button qc-modal-submit"
              disabled={
                submitState.status === "loading" ||
                authStatus !== "signed_in" ||
                !currentModeConfigReady
              }
              type="submit"
            >
              {submitState.status === "loading"
                ? "儲存中..."
                : !coreConfigReady
                ? "請先完成執行環境設定"
                : !currentModeConfigReady
                ? `請先完成${label}設定`
                : authStatus === "signed_in"
                ? `儲存${label}`
                : "請先登入後儲存"}
            </button>
          </div>
        </form>

        {submitState.status === "success" ? (
          <p className="status-message status-success" role="status">
            已儲存{quickCaptureModeLabel(submitState.movementType)}：TWD {submitState.amount}
            {submitState.description ? `，${submitState.description}` : ""}
            {batchMode && <span className="qc-batch-hint">  — 可繼續新增</span>}
          </p>
        ) : submitState.status === "failure" ? (
          <p className="status-message status-error" role="alert">
            {submitState.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ── Tree Category Picker ──

function CategoryTreeSelect({
  categories,
  mode,
  value,
  onChange,
}: {
  categories: CategoryItem[];
  mode: QuickCaptureMode;
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(
    new Set()
  );
  const ref = useRef<HTMLDivElement>(null);

  // Filter by mode
  const filtered = categories.filter((c) => {
    if (mode === "expense") {
      return c.groupingPurpose === null || c.groupingPurpose === "expense";
    }
    return c.groupingPurpose === "income";
  });

  // Build tree
  const childMap = useMemo(() => {
    const map = new Map<string | "root", CategoryItem[]>();
    for (const c of filtered) {
      const key = c.parentId ?? "root";
      const arr = map.get(key) ?? [];
      arr.push(c);
      map.set(key, arr);
    }
    return map;
  }, [filtered]);

  const selectedLabel =
    value === "none"
      ? "未選擇"
      : filtered.find((c) => c.id === value)?.label ?? "未選擇";

  const toggleExpand = (id: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectCategory = (id: string) => {
    onChange(id);
  };

  function renderTreeItems(parentId: string | null, depth: number): React.ReactNode[] {
    const key = parentId ?? "root";
    const children = childMap.get(key) ?? [];
    return children.flatMap((cat) => {
      const hasChildren = childMap.has(cat.id) && (childMap.get(cat.id)?.length ?? 0) > 0;
      const isExpanded = expandedParents.has(cat.id);
      const isSelected = value === cat.id;

      return [
        <button
          key={cat.id}
          type="button"
          className={`qc-tree-item ${isSelected ? "qc-tree-item-selected" : ""} ${
            hasChildren ? "qc-tree-item-parent" : "qc-tree-item-leaf"
          }`}
          style={{ paddingLeft: 12 + depth * 16 }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(cat.id);
            } else {
              selectCategory(cat.id);
            }
          }}
        >
          {hasChildren ? (
            <span className="qc-tree-arrow">{isExpanded ? "▾" : "▸"}</span>
          ) : (
            <span className="qc-tree-dot">·</span>
          )}
          <span className="qc-tree-label">{cat.label}</span>
          {isSelected && <span className="qc-tree-check">✓</span>}
        </button>,
        ...(hasChildren && isExpanded
          ? renderTreeItems(cat.id, depth + 1)
          : []),
      ];
    });
  }

  const hasAny = childMap.get("root")?.length ?? 0;

  return (
    <div className="qc-tree-wrapper" ref={ref}>
      <div className="qc-tree-dropdown qc-tree-dropdown-full">
        <button
          type="button"
          className={`qc-tree-item qc-tree-item-leaf ${value === "none" ? "qc-tree-item-selected" : ""}`}
          style={{ paddingLeft: 12 }}
          onClick={() => selectCategory("none")}
        >
          <span className="qc-tree-dot">·</span>
          <span className="qc-tree-label">未選擇</span>
          {value === "none" && <span className="qc-tree-check">✓</span>}
        </button>
        {hasAny > 0
          ? renderTreeItems(null, 0)
          : null}
      </div>
    </div>
  );
}

// ── Account Select (flat dropdown, tree-style trigger) ──

function AccountSelect({
  accounts,
  value,
  onChange,
  mode,
}: {
  accounts: AccountItem[];
  value: string;
  onChange: (id: string) => void;
  mode: QuickCaptureMode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selectedAccount = accounts.find((a) => a.id === value);
  const selectedLabel = selectedAccount
    ? selectedAccount.display_name
    : value
    ? "未知帳戶"
    : "選擇帳戶";

  const typeLabel = (type: string) => {
    switch (type) {
      case "checking": return "支票";
      case "savings": return "儲蓄";
      case "cash": return "現金";
      case "credit":
      case "credit_card": return "信用卡";
      case "bank": return "銀行";
      case "stored_value": return "貸款";
      case "other": return "其他";
      default: return type;
    }
  };

  return (
    <div className="qc-tree-wrapper qc-account-select" ref={ref}>
      <button
        type="button"
        className={`qc-tree-trigger ${open ? "qc-tree-trigger-open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <span className={`qc-tree-trigger-label ${!value ? "qc-tree-placeholder" : ""}`}>
          {selectedLabel}
        </span>
        <span className="qc-tree-trigger-arrow">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="qc-tree-dropdown qc-account-dropdown">
          {accounts
            .filter((a) => {
              // For income, show all account types; for expense, also show all
              return true;
            })
            .map((a) => (
              <button
                key={a.id}
                type="button"
                className={`qc-tree-item ${value === a.id ? "qc-tree-item-selected" : ""}`}
                onClick={() => {
                  onChange(a.id);
                  setOpen(false);
                }}
              >
                <span className="qc-tree-dot">·</span>
                <span className="qc-tree-label">{a.display_name}</span>
                <span className="qc-account-badge">{typeLabel(a.account_type)}</span>
                {value === a.id && <span className="qc-tree-check">✓</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
