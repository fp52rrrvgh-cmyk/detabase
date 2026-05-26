"use client";

import type { ReviewState } from "../types";
import { formatAmount } from "../lib/format";

export function ReviewDashboardStrip({
  canLoad,
  reviewState,
}: {
  canLoad: boolean;
  reviewState: ReviewState;
}) {
  const dashboardData =
    reviewState.status === "success" ? reviewState.data.dashboard : null;
  const currency = (value: string) => value || "TWD";

  return (
    <section className="review-section" aria-labelledby="dashboard-metrics-title">
      <div className="section-heading">
        <div>
          <h3 id="dashboard-metrics-title">唯讀支出快照</h3>
          <p className="empty-state">
            依目前檢視日期與收支篩選的已載入資料計算，不代表完整財務總覽。
            作廢紀錄預設不納入。
          </p>
        </div>
        <p className="session-status session-ready">唯讀</p>
      </div>

      {canLoad && !dashboardData ? (
        <p className="status-message" role="status">
          從快取資料載入唯讀支出快照中...
        </p>
      ) : null}

      {dashboardData ? (
        <div className="dashboard-card-strip">
          <article className="dashboard-card">
            <span className="dashboard-card-label">今日支出</span>
            {dashboardData.todaySpendingUnavailableMessage ? (
              <p className="status-message status-muted">
                {dashboardData.todaySpendingUnavailableMessage}
              </p>
            ) : (
              <strong className="dashboard-card-value">
                {formatAmount(dashboardData.todaySpending ?? 0, currency("TWD"))}
              </strong>
            )}
            <p className="dashboard-card-context">
              需涵蓋今日，且目前篩選需包含支出。
            </p>
          </article>

          <article className="dashboard-card">
            <span className="dashboard-card-label">本月支出</span>
            {dashboardData.thisMonthSpendingUnavailableMessage ? (
              <p className="status-message status-muted">
                {dashboardData.thisMonthSpendingUnavailableMessage}
              </p>
            ) : (
              <strong className="dashboard-card-value">
                {formatAmount(dashboardData.thisMonthSpending ?? 0, currency("TWD"))}
              </strong>
            )}
            <p className="dashboard-card-context">
              需涵蓋本月起至今日，且目前篩選需包含支出。
            </p>
          </article>

          <article className="dashboard-card">
            <span className="dashboard-card-label">近 7 日支出</span>
            {dashboardData.recent7DaySpendingUnavailableMessage ? (
              <p className="status-message status-muted">
                {dashboardData.recent7DaySpendingUnavailableMessage}
              </p>
            ) : (
              <strong className="dashboard-card-value">
                {formatAmount(dashboardData.recent7DaySpending ?? 0, currency("TWD"))}
              </strong>
            )}
            <p className="dashboard-card-context">
              需涵蓋近 7 日，且目前篩選需包含支出。
            </p>
          </article>

          <article className="dashboard-card dashboard-card--category">
            <span className="dashboard-card-label">
              本月最大支出分類
            </span>
            {dashboardData.topCategoryUnavailableMessage ? (
              <p className="status-message status-muted">
                {dashboardData.topCategoryUnavailableMessage}
              </p>
            ) : (
              <>
                <strong className="dashboard-card-value">
                  {dashboardData.topCategoryLabel}
                </strong>
                <p className="dashboard-card-amount">
                  {formatAmount(
                    dashboardData.topCategoryAmount ?? 0,
                    currency(dashboardData.topCategoryCurrency),
                  )}
                </p>
              </>
            )}
            <p className="dashboard-card-context">
              依本月已載入支出分類計算，需涵蓋本月起至今日。
            </p>
          </article>

          <article className="dashboard-card dashboard-card--category">
            <span className="dashboard-card-label">
              本月分類支出 Top 5
            </span>
            {dashboardData.topCategoriesThisMonthUnavailableMessage ? (
              <p className="status-message status-muted">
                {dashboardData.topCategoriesThisMonthUnavailableMessage}
              </p>
            ) : dashboardData.topCategoriesThisMonth.length > 0 ? (
              <ol className="dashboard-category-list">
                {dashboardData.topCategoriesThisMonth.map((category) => (
                  <li key={category.label}>
                    <span>{category.label}</span>
                    <strong>
                      {formatAmount(category.amount, currency(category.currency))}
                    </strong>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-state">本月無分類支出。</p>
            )}
            <p className="dashboard-card-context">
              依本月已載入支出分類排序，需涵蓋本月起至今日。
            </p>
          </article>
        </div>
      ) : (
        !canLoad && (
          <p className="status-message status-muted" role="status">
            請先登入 Staging 才能載入支出快照卡片。
          </p>
        )
      )}
    </section>
  );
}
