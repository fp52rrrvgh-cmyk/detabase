"use client";

import type { FormEvent } from "react";

import type {
  MovementFilter,
  ReviewData,
  VoidCorrectionState,
} from "../types";
import { movementFilterLabel } from "../constants";
import { TotalList } from "./TotalList";
import { formatAmount, formatOptionalTimestamp } from "../lib/format";

export function ReviewContent({
  data,
  onBeginVoidCorrection,
  onCancelVoidCorrection,
  onToggleVoidAudit,
  onVoidCorrectionSubmit,
  onVoidReasonChange,
  reviewMovementFilter,
  reviewStartDate,
  reviewEndDate,
  showVoidAudit,
  voidState,
}: {
  data: ReviewData;
  onBeginVoidCorrection: (activityId: string) => void;
  onCancelVoidCorrection: () => void;
  onToggleVoidAudit: () => void;
  onVoidCorrectionSubmit: (
    event: FormEvent<HTMLFormElement>,
    activityId: string,
    reason: string,
  ) => void;
  onVoidReasonChange: (activityId: string, reason: string) => void;
  reviewMovementFilter: MovementFilter;
  reviewStartDate: string;
  reviewEndDate: string;
  showVoidAudit: boolean;
  voidState: VoidCorrectionState;
}) {
  const isDefaultFilter = reviewMovementFilter === "all";
  const dateRangeLabel =
    reviewStartDate && reviewEndDate
      ? `${reviewStartDate} ~ ${reviewEndDate}`
      : "目前檢視區間";

  const emptyStateTitle = isDefaultFilter
    ? "此日期區間沒有可檢視活動。"
    : "目前篩選條件未命中任何結果。";

  const emptyStateHint = isDefaultFilter
    ? "本區域為唯讀。請先在快速輸入新增支出後，再回到此處檢視。"
    : `請調整檢視篩選條件以擴大結果（${dateRangeLabel}，收支類型 ${movementFilterLabel(
        reviewMovementFilter,
      )}).`;

  return (
    <div className="review-content">
      <section className="review-section" aria-labelledby="range-total-title">
        <h3 id="range-total-title">所選範圍合計</h3>
        <TotalList
          emptyLabel="此區間沒有活動。"
          totals={data.dateRangeTotals}
        />
      </section>

      <div className="totals-grid">
        <section className="review-section" aria-labelledby="movement-total-title">
          <h3 id="movement-total-title">依收支類型</h3>
          <TotalList emptyLabel="無收支合計。" totals={data.movementTotals} />
        </section>

        <section className="review-section" aria-labelledby="category-total-title">
          <h3 id="category-total-title">依分類</h3>
          <TotalList emptyLabel="無分類合計。" totals={data.categoryTotals} />
        </section>

        <section className="review-section" aria-labelledby="account-total-title">
          <h3 id="account-total-title">依帳戶</h3>
          <TotalList emptyLabel="無帳戶合計。" totals={data.accountTotals} />
        </section>
      </div>

      <section className="review-section" aria-labelledby="recent-activity-title">
        <div className="section-heading">
          <h3 id="recent-activity-title">最近有效紀錄</h3>
          <p className="session-status session-ready">
            顯示
            {data.activityGroups.reduce((total, group) => total + group.activityCount, 0)}{" "}
            筆
          </p>
        </div>

        {voidState.status === "success" ? (
          <p className="status-message status-success" role="status">
            {voidState.message}
          </p>
        ) : null}

        {voidState.status === "failure" ? (
          <p className="status-message status-error" role="alert">
            {voidState.message}
          </p>
        ) : null}

        {data.activityGroups.length > 0 ? (
          <div className="activity-groups">
            {data.activityGroups.map((group) => (
              <section className="activity-date-group" key={group.activityDate}>
                <div className="date-group-header">
                  <h4>{group.activityDate}</h4>
                  <p className="empty-state">共 {group.activityCount} 筆</p>
                </div>

                <ul className="activity-list activity-list--grouped">
                  {group.activities.map((activity) => {
                    const isExpense = activity.movementType === "expense";
                    const isConfirmingVoid =
                      voidState.status === "confirming" &&
                      voidState.activityId === activity.id;
                    const isLoadingVoid =
                      voidState.status === "loading" &&
                      voidState.activityId === activity.id;
                    const isAnyVoidLoading = voidState.status === "loading";

                    return (
                      <li className="activity-item" key={activity.id}>
                        <div className="activity-main">
                          <span className="activity-amount">
                            {formatAmount(activity.amount, activity.currency)}
                          </span>
                          <strong className="activity-movement">
                            {activity.movementType}
                          </strong>
                        </div>

                        <p className="activity-description">
                          {activity.description}
                        </p>

                        <div className="activity-meta activity-meta--review">
                          <span>{activity.accountName}</span>
                          <span>{activity.categoryName}</span>
                          <span className="activity-meta-created">
                            建立 {formatOptionalTimestamp(activity.createdAt)}
                          </span>
                        </div>

                        {isExpense && !isConfirmingVoid ? (
                          <div className="activity-actions">
                            <button
                              className="secondary-button void-action-button"
                              disabled={isAnyVoidLoading}
                              onClick={() => onBeginVoidCorrection(activity.id)}
                              type="button"
                            >
                              {isLoadingVoid ? "作廢中..." : "作廢"}
                            </button>
                          </div>
                        ) : null}

                        {isConfirmingVoid ? (
                          <form
                            className="void-confirmation"
                            onSubmit={(event) =>
                              onVoidCorrectionSubmit(
                                event,
                                activity.id,
                                voidState.reason,
                              )
                            }
                          >
                            <p>
                              確認作廢這筆支出？原始紀錄會保留，預設檢視與合計會排除它。
                            </p>
                            <label className="field compact-field void-reason-field">
                              <span>作廢原因</span>
                              <textarea
                                onChange={(event) =>
                                  onVoidReasonChange(activity.id, event.target.value)
                                }
                                required
                                rows={3}
                                value={voidState.reason}
                              />
                            </label>
                            {voidState.message ? (
                              <p className="status-message status-error" role="alert">
                                {voidState.message}
                              </p>
                            ) : null}
                            <div className="void-confirmation-actions">
                              <button
                                className="secondary-button"
                                onClick={onCancelVoidCorrection}
                                type="button"
                              >
                                取消
                              </button>
                              <button className="submit-button" type="submit">
                                確認作廢
                              </button>
                            </div>
                          </form>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        ) : (
          <p className="empty-state">
            {emptyStateTitle}
            <br />
            {emptyStateHint}
          </p>
        )}
      </section>

      <section className="review-section" aria-labelledby="void-audit-title">
        <div className="section-heading">
          <div>
            <h3 id="void-audit-title">作廢稽核紀錄</h3>
            <p className="empty-state">
              僅提供作廢活動背景的唯讀說明，不提供任何異動行為。
            </p>
          </div>
          <p className="session-status">
            {data.voidAuditItems.length} 筆作廢稽核
          </p>
        </div>

        <button
          aria-controls="void-audit-content"
          aria-expanded={showVoidAudit}
          className="secondary-button"
          onClick={onToggleVoidAudit}
          type="button"
        >
          {showVoidAudit ? "隱藏作廢稽核" : "顯示作廢稽核"}
        </button>

        {showVoidAudit ? (
          <div id="void-audit-content" className="review-content">
            <p className="status-message status-muted" role="status">
              預設檢視與合計會排除作廢活動，該紀錄區塊為唯讀。
            </p>

            {data.voidAuditItems.length > 0 ? (
              <ul className="activity-list">
                {data.voidAuditItems.map((item, index) => (
                  <li
                    className="activity-item"
                    key={`${item.activityDate}-${item.correctionCreatedAt ?? index}`}
                  >
                    <div className="activity-main">
                      <span>{item.activityDate}</span>
                      <strong>{formatAmount(item.amount, item.currency)}</strong>
                    </div>
                    <div className="activity-meta">
                      <span>
                        {item.correctionType === "void"
                          ? "已作廢"
                          : "更正紀錄"}
                      </span>
                      <span>{item.movementType}</span>
                      <span>{item.accountName}</span>
                      <span>{item.categoryName}</span>
                    </div>
                    <p>{item.description}</p>
                    <p>原因：{item.reason}</p>
                    <small>
                      更正時間：{formatOptionalTimestamp(item.correctionCreatedAt)}
                    </small>
                    <small>
                      原始建立：{formatOptionalTimestamp(item.createdAt)}
                    </small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                無符合目前篩選條件的作廢稽核紀錄。
              </p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
