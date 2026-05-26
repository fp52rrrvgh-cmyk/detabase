"use client";

import type { FormEvent } from "react";

import { MOVEMENT_FILTER_OPTIONS } from "../constants";
import type {
  MovementFilter,
  ReviewState,
  VoidCorrectionState,
} from "../types";

import { ReviewDashboardStrip } from "./ReviewDashboardStrip";
import { ReviewStateStrip } from "./ReviewStateStrip";
import { ReviewContent } from "./ReviewContent";

export function FinanceReviewPanel({
  canLoad,
  endDate,
  movementFilter,
  onBeginVoidCorrection,
  onCancelVoidCorrection,
  onEndDateChange,
  onMovementFilterChange,
  onRefresh,
  onStartDateChange,
  onToggleVoidAudit,
  onVoidCorrectionSubmit,
  onVoidReasonChange,
  reviewState,
  showVoidAudit,
  startDate,
  voidState,
}: {
  canLoad: boolean;
  endDate: string;
  movementFilter: MovementFilter;
  onBeginVoidCorrection: (activityId: string) => void;
  onCancelVoidCorrection: () => void;
  onEndDateChange: (value: string) => void;
  onMovementFilterChange: (value: MovementFilter) => void;
  onRefresh: () => void;
  onStartDateChange: (value: string) => void;
  onToggleVoidAudit: () => void;
  onVoidCorrectionSubmit: (
    event: FormEvent<HTMLFormElement>,
    activityId: string,
    reason: string,
  ) => void;
  onVoidReasonChange: (activityId: string, reason: string) => void;
  reviewState: ReviewState;
  showVoidAudit: boolean;
  startDate: string;
  voidState: VoidCorrectionState;
}) {
  const isLoading = reviewState.status === "loading";

  return (
    <section className="review-panel" aria-labelledby="review-title">
      <div className="page-heading review-heading">
        <p className="eyebrow">Staging 唯讀檢視</p>
        <h2 id="review-title">財務檢視</h2>
        <p className="summary">
          只透過瀏覽器直接讀取，顯示已登入 Staging 使用者的
          RLS 擁有資料。
        </p>
      </div>

      <ReviewDashboardStrip reviewState={reviewState} canLoad={canLoad} />

      <div className="review-controls-stack">
        <div className="review-filters" aria-label="檢視篩選">
          <label className="field compact-field">
            <span>開始日期</span>
            <input
              onChange={(event) => onStartDateChange(event.target.value)}
              type="date"
              value={startDate}
            />
          </label>

          <label className="field compact-field">
            <span>結束日期</span>
            <input
              onChange={(event) => onEndDateChange(event.target.value)}
              type="date"
              value={endDate}
            />
          </label>

          <label className="field compact-field">
            <span>收支類型</span>
            <select
              onChange={(event) =>
                onMovementFilterChange(event.target.value as MovementFilter)
              }
              value={movementFilter}
            >
              {MOVEMENT_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <button
            className="secondary-button review-refresh"
            disabled={!canLoad || isLoading}
            onClick={onRefresh}
            type="button"
          >
            {isLoading ? "讀取中..." : "重新整理檢視"}
          </button>
        </div>

        <ReviewStateStrip
          endDate={endDate}
          movementFilter={movementFilter}
          reviewState={reviewState}
          showVoidAudit={showVoidAudit}
          startDate={startDate}
        />
      </div>

      {!canLoad ? (
        <p className="status-message status-muted" role="status">
          請先完成執行環境設定並登入後，才能載入唯讀檢視資料。
        </p>
      ) : null}

      {reviewState.status === "loading" ? (
        <p className="status-message" role="status">
          讀取唯讀檢視資料中...
        </p>
      ) : null}

      {reviewState.status === "failure" ? (
        <p className="status-message status-error" role="alert">
          {reviewState.message}
        </p>
      ) : null}

      {reviewState.status === "success" ? (
        <ReviewContent
          data={reviewState.data}
          onBeginVoidCorrection={onBeginVoidCorrection}
          onCancelVoidCorrection={onCancelVoidCorrection}
          onToggleVoidAudit={onToggleVoidAudit}
          onVoidCorrectionSubmit={onVoidCorrectionSubmit}
          onVoidReasonChange={onVoidReasonChange}
          showVoidAudit={showVoidAudit}
          reviewMovementFilter={movementFilter}
          reviewStartDate={startDate}
          reviewEndDate={endDate}
          voidState={voidState}
        />
      ) : null}
    </section>
  );
}
