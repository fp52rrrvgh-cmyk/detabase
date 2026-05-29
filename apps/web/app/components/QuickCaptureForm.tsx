"use client";

import type { FormEvent } from "react";

import type {
  QuickCaptureMode,
  SubmitState,
} from "../types";

import {
  quickCaptureModeLabel,
} from "../lib/format";

import { StatusMessage } from "./StatusMessage";

export type QuickCaptureFormProps = {
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

export function QuickCaptureForm({
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
}: QuickCaptureFormProps) {
  const label = quickCaptureModeLabel(mode);

  return (
    <div className="quick-capture-block" aria-label="快速財務輸入">
      <form className="entry-form" onSubmit={onSubmit}>
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

        <label className="field">
          <span>金額</span>
          <input
            inputMode="numeric"
            min="1"
            name="amount"
            onChange={(event) => onAmountChange(event.target.value)}
            placeholder="100"
            required
            step="1"
            title="請輸入正整數 TWD 金額。"
            type="number"
            value={amount}
          />
        </label>

        <label className="field">
          <span>描述</span>
          <textarea
            name="description"
            onChange={(event) => onDescriptionChange(event.target.value)}
            placeholder={`簡短${label}備註`}
            required
            rows={4}
            value={description}
          />
        </label>

        <label className="field">
          <span>分類</span>
          <select
            value={categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
          >
            <option value="none">未選擇</option>
            {categories
              .filter((c) => {
                // expense: grouping_purpose is null or 'expense'
                // income: grouping_purpose is 'income'
                // fallback: show all if grouping_purpose is null (legacy)
                if (mode === "expense") {
                  return c.groupingPurpose === null || c.groupingPurpose === "expense";
                }
                return c.groupingPurpose === "income";
              })
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
          </select>
        </label>

        <div className="fixed-details" aria-label="提交明細">
          <span>{label}</span>
          <span>TWD</span>
          <span>{activityDate || "本機目前日期"}</span>
        </div>

        <button
          className="submit-button"
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

      <StatusMessage
        coreConfigReady={coreConfigReady}
        mode={mode}
        modeConfigReady={currentModeConfigReady}
        state={submitState}
      />
    </div>
  );
}
