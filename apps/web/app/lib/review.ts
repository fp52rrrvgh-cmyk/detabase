import type {
  ActivityGroup,
  CategorySpendingLine,
  CorrectionRow,
  DashboardSpendingCard,
  DisplayActivity,
  FinanceActivityRow,
  MovementFilter,
  MovementType,
  ReferenceRow,
  ReviewData,
  TotalLine,
  VoidAuditItem,
} from "../types";
import { movementFilterLabel } from "../constants";
import { currentLocalDate, isDateWithinRange, localDateDaysAgo, localMonthStartDate } from "./date";
import { normalizeAmount, safeReferenceLabel } from "./format";

export function summarizeTotals(
  activities: FinanceActivityRow[],
  getLabel: (activity: FinanceActivityRow) => string,
): TotalLine[] {
  const totals = new Map<string, TotalLine>();

  for (const activity of activities) {
    const label = getLabel(activity);
    const currency = activity.currency || "TWD";
    const key = `${label}\u0000${currency}`;
    const current = totals.get(key);
    const amount = normalizeAmount(activity.amount);

    if (current) {
      current.amount += amount;
    } else {
      totals.set(key, { label, currency, amount });
    }
  }

  return Array.from(totals.values()).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
}

export function summarizeTopCategoryTotals(
  activities: FinanceActivityRow[],
  getLabel: (activity: FinanceActivityRow) => string,
): CategorySpendingLine[] {
  const totals = new Map<string, CategorySpendingLine>();

  for (const activity of activities) {
    const label = getLabel(activity);
    const currency = activity.currency || "TWD";
    const key = `${label}\u0000${currency}`;
    const current = totals.get(key);
    const amount = normalizeAmount(activity.amount);

    if (current) {
      current.amount += amount;
    } else {
      totals.set(key, { label, currency, amount });
    }
  }

  return Array.from(totals.values()).sort(
    (left, right) =>
      right.amount - left.amount || left.label.localeCompare(right.label),
  );
}


export function sumAmountsByDateRange(
  activities: FinanceActivityRow[],
  startDate: string,
  endDate: string,
): number {
  return activities
    .filter((activity) => isDateWithinRange(activity.activity_date, startDate, endDate))
    .reduce((sum, activity) => sum + normalizeAmount(activity.amount), 0);
}

export function activeReviewActivities(
  activities: FinanceActivityRow[],
  corrections: CorrectionRow[],
): FinanceActivityRow[] {
  const voidedActivityIds = new Set(
    corrections
      .filter((correction) => correction.correction_type === "void")
      .map((correction) => correction.activity_id)
      .filter((activityId): activityId is string => Boolean(activityId)),
  );

  if (voidedActivityIds.size === 0) {
    return activities;
  }

  return activities.filter((activity) => !voidedActivityIds.has(activity.id));
}

export function buildReviewData(
  activities: FinanceActivityRow[],
  corrections: CorrectionRow[],
  accounts: ReferenceRow[],
  categories: ReferenceRow[],
  reviewStartDate: string,
  reviewEndDate: string,
  movementFilter: MovementFilter,
): ReviewData {
  const accountNames = new Map(
    accounts.map((account) => [
      account.id,
      account.display_name?.trim() || "未命名帳戶",
    ]),
  );
  const categoryNames = new Map(
    categories.map((category) => [
      category.id,
      category.display_name?.trim() || "未命名分類",
    ]),
  );
  const activeActivities = activeReviewActivities(activities, corrections);
  const activityById = new Map(
    activities.map((activity) => [activity.id, activity]),
  );
  const voidAuditItems = corrections
    .filter((correction) => correction.correction_type === "void")
    .map((correction): VoidAuditItem | null => {
      const activity = correction.activity_id
        ? activityById.get(correction.activity_id)
        : null;

      if (!activity) {
        return null;
      }

      return {
        id: activity.id,
        activityDate: activity.activity_date,
        movementType: activity.movement_type,
        amount: normalizeAmount(activity.amount),
        currency: activity.currency || "TWD",
        accountName: safeReferenceLabel(
          accountNames,
          activity.account_id,
          "未命名帳戶",
        ),
        categoryName: safeReferenceLabel(
          categoryNames,
          activity.category_id,
          "未命名分類",
        ),
        description: activity.description?.trim() || "未提供描述",
        createdAt: activity.created_at,
        correctionType: "void",
        reason: correction.reason?.trim() || "未提供原因",
        correctionCreatedAt: correction.created_at,
      };
    })
    .filter((item): item is VoidAuditItem => item !== null)
    .sort((left, right) => {
      const leftTime = left.correctionCreatedAt
        ? new Date(left.correctionCreatedAt).getTime()
        : 0;
      const rightTime = right.correctionCreatedAt
        ? new Date(right.correctionCreatedAt).getTime()
        : 0;

      return rightTime - leftTime;
    });

  const mappedActivities = activeActivities
    .slice(0, 25)
    .map((activity) => ({
      id: activity.id,
      activityDate: activity.activity_date,
      movementType: activity.movement_type,
      amount: normalizeAmount(activity.amount),
      currency: activity.currency || "TWD",
      accountName: safeReferenceLabel(
        accountNames,
        activity.account_id,
        "未命名帳戶",
      ),
      categoryName: safeReferenceLabel(
        categoryNames,
        activity.category_id,
        "未命名分類",
      ),
      description: activity.description?.trim() || "未提供描述",
      createdAt: activity.created_at,
    }));

  const activeExpenseActivities = activeActivities.filter(
    (activity) => activity.movement_type === "expense",
  );
  const today = currentLocalDate();
  const recent7DayStart = localDateDaysAgo(6);
  const monthStart = localMonthStartDate();
  const monthEnd = currentLocalDate();
  const categoryTotalsThisMonth = summarizeTopCategoryTotals(
    activeExpenseActivities.filter((activity) =>
      isDateWithinRange(activity.activity_date, monthStart, monthEnd),
    ),
    (activity) =>
      safeReferenceLabel(
        categoryNames,
        activity.category_id,
        "未命名分類",
      ),
  );
  const topCategoryThisMonth = categoryTotalsThisMonth[0];
  const includeExpense = movementFilter === "all" || movementFilter === "expense";
  const todayCovered = reviewStartDate <= today && reviewEndDate >= today;
  const thisMonthCovered =
    reviewStartDate <= monthStart && reviewEndDate >= monthEnd;
  const recent7DayCovered =
    reviewStartDate <= recent7DayStart && reviewEndDate >= today;
  const expenseFilterBlocked = !includeExpense;
  const getBlockingMessage = (
    rangeCovered: boolean,
    requiresMonthWindow = false,
  ): string | null => {
    if (expenseFilterBlocked) {
      return "目前篩選不包含支出";
    }

    if (!rangeCovered) {
      return "目前範圍不足，請調整檢視日期範圍";
    }

    return null;
  };
  const todayUnavail = getBlockingMessage(todayCovered);
  const thisMonthUnavail = getBlockingMessage(thisMonthCovered);
  const recent7DayUnavail = getBlockingMessage(recent7DayCovered);
  const topCategoryUnavailableMessage = getBlockingMessage(thisMonthCovered, true);
  const topCategoriesThisMonthUnavailableMessage = getBlockingMessage(thisMonthCovered, true);

  const dashboardCardData: DashboardSpendingCard = {
    todaySpending: todayUnavail ? null : sumAmountsByDateRange(
      activeExpenseActivities,
      today,
      today,
    ),
    todaySpendingCurrency: "TWD",
    todaySpendingUnavailableMessage: todayUnavail,
    thisMonthSpending: thisMonthUnavail
      ? null
      : sumAmountsByDateRange(activeExpenseActivities, monthStart, monthEnd),
    thisMonthSpendingCurrency: "TWD",
    thisMonthSpendingUnavailableMessage: thisMonthUnavail,
    recent7DaySpending: recent7DayUnavail
      ? null
      : sumAmountsByDateRange(activeExpenseActivities, recent7DayStart, today),
    recent7DaySpendingCurrency: "TWD",
    recent7DaySpendingUnavailableMessage: recent7DayUnavail,
    topCategoryLabel: topCategoryThisMonth ? topCategoryThisMonth.label : "無分類",
    topCategoryAmount: topCategoryThisMonth ? topCategoryThisMonth.amount : 0,
    topCategoryCurrency: topCategoryThisMonth
      ? topCategoryThisMonth.currency
      : "TWD",
    topCategoryUnavailableMessage,
    topCategoriesThisMonthUnavailableMessage,
    topCategoriesThisMonth: categoryTotalsThisMonth.slice(0, 5),
  };

  const groupedMap = new Map<string, DisplayActivity[]>();
  const orderedDateKeys: string[] = [];

  for (const mappedActivity of mappedActivities) {
    if (!groupedMap.has(mappedActivity.activityDate)) {
      groupedMap.set(mappedActivity.activityDate, []);
      orderedDateKeys.push(mappedActivity.activityDate);
    }

    groupedMap.get(mappedActivity.activityDate)?.push(mappedActivity);
  }

  const activityGroups: ActivityGroup[] = orderedDateKeys
    .map((activityDate) => ({
      activityDate,
      activityCount: groupedMap.get(activityDate)?.length ?? 0,
      activities: groupedMap.get(activityDate) ?? [],
    }))
    .filter((group) => group.activityCount > 0);

  return {
    activities: mappedActivities,
    activityGroups,
    dateRangeTotals: summarizeTotals(activeActivities, () => "所選範圍"),
    movementTotals: summarizeTotals(
      activeActivities,
      (activity) =>
        movementFilterLabel((activity.movement_type as MovementType) ?? "all"),
    ),
    categoryTotals: summarizeTotals(activeActivities, (activity) =>
      safeReferenceLabel(categoryNames, activity.category_id, "未命名分類"),
    ),
    accountTotals: summarizeTotals(activeActivities, (activity) =>
      safeReferenceLabel(accountNames, activity.account_id, "未命名帳戶"),
    ),
    voidAuditItems,
    dashboard: dashboardCardData,
  };
}
