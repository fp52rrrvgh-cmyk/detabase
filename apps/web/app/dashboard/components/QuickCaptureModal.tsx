"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import type { QuickCaptureMode, SubmitState } from "../../types";

import { quickCaptureModeLabel } from "../../lib/format";

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

const CATEGORY_EMOJI: Record<string, string> = {
  "加油": "⛽",
  "餐飲": "🍽️",
  "香菸": "🚬",
  "停車": "🅿️",
  "過路費": "🛣️",
  "保養": "🔧",
  "保險": "🛡️",
  "維修": "🔩",
  "輪胎": "⚙️",
  "貨物": "📦",
  "罰單": "📋",
  "通訊": "📱",
  "娛樂": "🎮",
  "購物": "🛒",
  "醫療": "🏥",
  "教育": "📚",
  "居住": "🏠",
  "水電": "💡",
  "交通": "🚗",
  "薪資": "💰",
  "其他": "📌",
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
  categories: { id: string; label: string; groupingPurpose: string | null }[];
  onAmountChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onModeChange: (mode: QuickCaptureMode) => void;
  onCategoryChange: (id: string) => void;
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
  onAmountChange,
  onDescriptionChange,
  onModeChange,
  onCategoryChange,
  onSubmit,
}: QuickCaptureModalProps) {
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);

  // Reset category list view when modal opens
  useEffect(() => {
    if (open) {
      setShowAllCategories(false);
      // Focus amount input after a short delay
      setTimeout(() => amountInputRef.current?.focus(), 200);
    }
  }, [open]);

  // Auto close on success
  useEffect(() => {
    if (submitState.status === "success") {
      const timer = setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [submitState.status, onClose, onSuccess]);

  if (!open) return null;

  const label = quickCaptureModeLabel(mode);

  // Filter categories by mode
  const filteredCategories = categories.filter((c) => {
    if (mode === "expense") {
      return c.groupingPurpose === null || c.groupingPurpose === "expense";
    }
    return c.groupingPurpose === "income";
  });

  // Top 4 + the rest
  const topCategories = filteredCategories.slice(0, 4);
  const moreCategories = filteredCategories.slice(4);
  const displayCategories = showAllCategories ? filteredCategories : topCategories;

  const handleQuickAmount = (val: number) => {
    onAmountChange(String(val));
  };

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
          <button
            className="qc-modal-close"
            onClick={onClose}
            type="button"
            aria-label="關閉"
          >
            ✕
          </button>
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

          {/* Category icon grid */}
          <div className="qc-cat-section">
            <span className="field-label">分類</span>
            <div className="qc-cat-grid">
              {displayCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`qc-cat-btn ${
                    categoryId === c.id ? "qc-cat-btn-active" : ""
                  }`}
                  onClick={() => onCategoryChange(c.id)}
                >
                  <span className="qc-cat-icon">
                    {CATEGORY_EMOJI[c.label] || "📌"}
                  </span>
                  <span className="qc-cat-lbl">{c.label}</span>
                </button>
              ))}
              {filteredCategories.length > 4 && !showAllCategories && (
                <button
                  type="button"
                  className="qc-cat-btn qc-cat-more"
                  onClick={() => setShowAllCategories(true)}
                >
                  <span className="qc-cat-icon">⋯</span>
                  <span className="qc-cat-lbl">更多</span>
                </button>
              )}
            </div>
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
        </form>

        {submitState.status === "success" ? (
          <p className="status-message status-success" role="status">
            已儲存{quickCaptureModeLabel(submitState.movementType)}：TWD {submitState.amount}
            {submitState.description ? `，${submitState.description}` : ""}
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
