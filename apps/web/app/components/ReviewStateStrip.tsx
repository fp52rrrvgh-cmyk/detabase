"use client";

import type { MovementFilter, ReviewState } from "../types";
import { movementFilterLabel } from "../constants";

export function ReviewStateStrip({
  endDate,
  movementFilter,
  reviewState,
  showVoidAudit,
  startDate,
}: {
  endDate: string;
  movementFilter: MovementFilter;
  reviewState: ReviewState;
  showVoidAudit: boolean;
  startDate: string;
}) {
  const loadedData =
    reviewState.status === "success" ? reviewState.data : undefined;
  const rangeLabel =
    startDate && endDate ? `${startDate} ~ ${endDate}` : "請選擇日期";
  const activeCountLabel = loadedData
    ? `${loadedData.activities.length} 筆已顯示`
    : "載入中";
  const auditCountLabel = loadedData
    ? `${loadedData.voidAuditItems.length} 筆可見紀錄`
    : "載入中";

  return (
    <section className="review-section" aria-labelledby="review-state-title">
      <div className="section-heading">
        <div>
          <h3 id="review-state-title">檢視狀態</h3>
          <p className="empty-state">
            預設為 active-only 檢視與匯總，作廢活動預設不納入。
          </p>
        </div>
        <p className="session-status session-ready">唯讀</p>
      </div>

      <div className="activity-meta" aria-label="目前檢視狀態">
        <span>模式：唯讀活動檢視</span>
        <span>日期：{rangeLabel}</span>
        <span>收支：{movementFilterLabel(movementFilter)}</span>
        <span>
          作廢稽核：{showVoidAudit ? "已啟用" : "隱藏"}
        </span>
        <span>有效紀錄：{activeCountLabel}</span>
        <span>稽核紀錄：{auditCountLabel}</span>
        <span>不會寫入</span>
      </div>
    </section>
  );
}
