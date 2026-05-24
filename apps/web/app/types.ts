// Extracted from page.tsx (W1 refactor) — type definitions only, no runtime code.

export type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      activityDate: string;
      amount: string;
      description: string;
      movementType: QuickCaptureMode;
    }
  | { status: "failure"; message: string };

export type AuthStatus = "checking" | "signed_out" | "signed_in";

export type AuthMessage =
  | { status: "success"; message: string }
  | { status: "failure"; message: string };

export type RuntimeConfig = {
  supabaseUrl: string;
  publishableKey: string;
  functionUrl: string;
  expenseAccountId: string;
  expenseCategoryId: string;
  incomeAccountId: string;
  incomeCategoryId: string;
};

export type RuntimeStatusItem = {
  name: string;
  configured: boolean;
};

export type MovementType = "income" | "expense" | "transfer" | "adjustment";
export type MovementFilter = "all" | MovementType;
export type QuickCaptureMode = "expense" | "income";

export type FinanceActivityRow = {
  id: string;
  activity_date: string;
  movement_type: MovementType | string;
  amount: string | number;
  currency: string;
  account_id: string | null;
  category_id: string | null;
  description: string | null;
  created_at: string | null;
};

export type ReferenceRow = {
  id: string;
  display_name: string | null;
};

export type CorrectionRow = {
  activity_id: string | null;
  correction_type: string | null;
  reason: string | null;
  created_at: string | null;
};

export type DisplayActivity = {
  id: string;
  activityDate: string;
  movementType: string;
  amount: number;
  currency: string;
  accountName: string;
  categoryName: string;
  description: string;
  createdAt: string | null;
};

export type ActivityGroup = {
  activityDate: string;
  activityCount: number;
  activities: DisplayActivity[];
};

export type VoidAuditItem = DisplayActivity & {
  correctionType: string;
  reason: string;
  correctionCreatedAt: string | null;
};

export type TotalLine = {
  label: string;
  currency: string;
  amount: number;
};

export type CategorySpendingLine = {
  label: string;
  currency: string;
  amount: number;
};

export type DashboardSpendingCard = {
  todaySpending: number | null;
  todaySpendingCurrency: string;
  todaySpendingUnavailableMessage: string | null;
  thisMonthSpending: number | null;
  thisMonthSpendingCurrency: string;
  thisMonthSpendingUnavailableMessage: string | null;
  recent7DaySpending: number | null;
  recent7DaySpendingCurrency: string;
  recent7DaySpendingUnavailableMessage: string | null;
  topCategoryLabel: string;
  topCategoryAmount: number | null;
  topCategoryCurrency: string;
  topCategoryUnavailableMessage: string | null;
  topCategoriesThisMonthUnavailableMessage: string | null;
  topCategoriesThisMonth: CategorySpendingLine[];
};

export type ReviewData = {
  activities: DisplayActivity[];
  activityGroups: ActivityGroup[];
  dateRangeTotals: TotalLine[];
  movementTotals: TotalLine[];
  categoryTotals: TotalLine[];
  accountTotals: TotalLine[];
  voidAuditItems: VoidAuditItem[];
  dashboard: DashboardSpendingCard;
};

export type ReviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ReviewData }
  | { status: "failure"; message: string };

export type VoidCorrectionState =
  | { status: "idle" }
  | { status: "confirming"; activityId: string; reason: string; message?: string }
  | { status: "loading"; activityId: string }
  | { status: "success"; message: string }
  | { status: "failure"; message: string };
