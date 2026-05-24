"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  ActivityGroup,
  AuthMessage,
  AuthStatus,
  CategorySpendingLine,
  CorrectionRow,
  DashboardSpendingCard,
  DisplayActivity,
  FinanceActivityRow,
  MovementFilter,
  MovementType,
  QuickCaptureMode,
  ReferenceRow,
  ReviewData,
  ReviewState,
  RuntimeConfig,
  RuntimeStatusItem,
  SubmitState,
  TotalLine,
  VoidAuditItem,
  VoidCorrectionState,
} from "./types";

import {
  CORE_RUNTIME_KEYS,
  EXPENSE_RUNTIME_KEYS,
  INCOME_RUNTIME_KEYS,
  MOVEMENT_FILTER_OPTIONS,
  REQUEST_FAILURE_MESSAGE,
  REVIEW_FAILURE_MESSAGE,
  RUNTIME_ENVIRONMENT_FIELDS,
  UUID_PATTERN,
  VOID_SUCCESS_MESSAGE,
  movementFilterLabel,
  runtimeConfig,
} from "./constants";

import {
  currentLocalDate,
  defaultReviewDateRange,
  isDateWithinRange,
  localDateDaysAgo,
  localMonthStartDate,
} from "./lib/date";

import {
  formatAmount,
  formatOptionalTimestamp,
  isPositiveIntegerAmount,
  normalizeAmount,
  quickCaptureModeLabel,
  safeReferenceLabel,
} from "./lib/format";

import {
  hasRuntimeFields,
  runtimeEnvironmentStatus,
  runtimeRefsForMode,
} from "./lib/runtime";

import {
  deriveVoidFunctionUrl,
  extractSafeErrorCode,
  safeFailureMessage,
  safeVoidFailureMessage,
} from "./lib/errors";

async function readSafeJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}


function summarizeTotals(
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

function summarizeTopCategoryTotals(
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


function sumAmountsByDateRange(
  activities: FinanceActivityRow[],
  startDate: string,
  endDate: string,
): number {
  return activities
    .filter((activity) => isDateWithinRange(activity.activity_date, startDate, endDate))
    .reduce((sum, activity) => sum + normalizeAmount(activity.amount), 0);
}

function activeReviewActivities(
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

function buildReviewData(
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

export default function ExpenseEntryPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authMessage, setAuthMessage] = useState<AuthMessage | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [quickCaptureMode, setQuickCaptureMode] =
    useState<QuickCaptureMode>("expense");
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });
  const defaultRange = useMemo(() => defaultReviewDateRange(), []);
  const [reviewStartDate, setReviewStartDate] = useState(
    defaultRange.startDate,
  );
  const [reviewEndDate, setReviewEndDate] = useState(defaultRange.endDate);
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("all");
  const [reviewState, setReviewState] = useState<ReviewState>({
    status: "idle",
  });
  const [showVoidAudit, setShowVoidAudit] = useState(false);
  const [voidState, setVoidState] = useState<VoidCorrectionState>({
    status: "idle",
  });

  const runtimeStatusItems = runtimeEnvironmentStatus(runtimeConfig);
  const runtimeReady = runtimeStatusItems.every((item) => item.configured);
  const coreConfigReady = hasRuntimeFields(runtimeConfig, CORE_RUNTIME_KEYS);
  const expenseConfigReady = hasRuntimeFields(
    runtimeConfig,
    EXPENSE_RUNTIME_KEYS,
  );
  const incomeConfigReady = hasRuntimeFields(
    runtimeConfig,
    INCOME_RUNTIME_KEYS,
  );
  const currentModeConfigReady =
    quickCaptureMode === "income" ? incomeConfigReady : expenseConfigReady;
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) {
      return null;
    }

    return createClient(
      runtimeConfig.supabaseUrl,
      runtimeConfig.publishableKey,
    );
  }, []);

  useEffect(() => {
    setActivityDate(currentLocalDate());
  }, []);

  useEffect(() => {
    if (!supabase) {
      setAuthStatus("signed_out");
      setSession(null);
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) {
          return;
        }

        setSession(data.session);
        setAuthStatus(data.session ? "signed_in" : "signed_out");
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setSession(null);
        setAuthStatus("signed_out");
      setAuthMessage({
        status: "failure",
        message: "無法安全確認 Session 狀態。",
      });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthStatus(nextSession ? "signed_in" : "signed_out");

      if (nextSession) {
        setAuthMessage(null);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const loadReviewData = useCallback(async () => {
    if (
      !coreConfigReady ||
      !supabase ||
      authStatus !== "signed_in" ||
      !session
    ) {
      setReviewState({ status: "idle" });
      return;
    }

    if (!reviewStartDate || !reviewEndDate || reviewStartDate > reviewEndDate) {
      setReviewState({
        status: "failure",
        message: "請選擇有效的檢視日期區間。",
      });
      return;
    }

    setReviewState({ status: "loading" });

    const {
      data: { session: currentSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !currentSession) {
      setReviewState({
        status: "failure",
        message: "請先登入再載入檢視資料。",
      });
      return;
    }

    let activityQuery = supabase
      .from("finance_activities")
      .select(
        "id,activity_date,movement_type,amount,currency,account_id,category_id,description,created_at",
      )
      .gte("activity_date", reviewStartDate)
      .lte("activity_date", reviewEndDate)
      .order("activity_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1000);

    if (movementFilter !== "all") {
      activityQuery = activityQuery.eq("movement_type", movementFilter);
    }

    const activityResult = await activityQuery;

    if (activityResult.error) {
      setReviewState({
        status: "failure",
        message: REVIEW_FAILURE_MESSAGE,
      });
      return;
    }

    const activities = (activityResult.data ?? []) as FinanceActivityRow[];
    const activityIds = activities.map((activity) => activity.id);

    let correctionResult:
      | {
          data: unknown[] | null;
          error: { message: string } | null;
        }
      | null = null;

    if (activityIds.length > 0) {
      correctionResult = await supabase
        .from("finance_activity_corrections")
        .select("activity_id,correction_type,reason,created_at")
        .eq("correction_type", "void")
        .in("activity_id", activityIds)
        .limit(1000);
    }

    const [accountResult, categoryResult] = await Promise.all([
      supabase
        .from("finance_accounts")
        .select("id,display_name")
        .order("display_name", { ascending: true })
        .limit(500),
      supabase
        .from("finance_categories")
        .select("id,display_name")
        .order("display_name", { ascending: true })
        .limit(500),
    ]);

    if (
      correctionResult?.error ||
      accountResult.error ||
      categoryResult.error
    ) {
      setReviewState({
        status: "failure",
        message: REVIEW_FAILURE_MESSAGE,
      });
      return;
    }

      setReviewState({
        status: "success",
        data: buildReviewData(
          activities,
          (correctionResult?.data ?? []) as CorrectionRow[],
          (accountResult.data ?? []) as ReferenceRow[],
          (categoryResult.data ?? []) as ReferenceRow[],
          reviewStartDate,
          reviewEndDate,
          movementFilter,
        ),
      });
  }, [
    authStatus,
    coreConfigReady,
    movementFilter,
    reviewEndDate,
    reviewStartDate,
    session,
    supabase,
  ]);

  useEffect(() => {
    if (authStatus === "signed_in" && session && coreConfigReady) {
      void loadReviewData();
      return;
    }

    setReviewState({ status: "idle" });
  }, [authStatus, coreConfigReady, loadReviewData, session]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage(null);

    const trimmedEmail = email.trim();
    if (!coreConfigReady || !supabase) {
      setAuthMessage({
        status: "failure",
        message: "執行環境設定不完整，先補齊設定後再試。",
      });
      return;
    }

    if (!trimmedEmail || !password) {
      setAuthMessage({
        status: "failure",
        message: "請輸入 Staging 帳號與密碼。",
      });
      return;
    }

    setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });
    setAuthLoading(false);

    if (error || !data.session) {
      setSession(null);
      setAuthStatus("signed_out");
      setAuthMessage({
        status: "failure",
        message: "登入失敗，請檢查 Staging 帳號與密碼。",
      });
      return;
    }

    setPassword("");
    setSession(data.session);
    setAuthStatus("signed_in");
    setAuthMessage({
      status: "success",
      message: "已完成 Staging 登入。",
    });
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setAuthLoading(true);
    const { error } = await supabase.auth.signOut();
    setAuthLoading(false);

    if (error) {
      setAuthMessage({
        status: "failure",
        message: "登出失敗，請稍後再試。",
      });
      return;
    }

    setSession(null);
    setAuthStatus("signed_out");
    setSubmitState({ status: "idle" });
    setReviewState({ status: "idle" });
    setShowVoidAudit(false);
    setVoidState({ status: "idle" });
    setAuthMessage({
      status: "success",
      message: "已登出。",
    });
  }

  function clearSettledSubmitState() {
    setSubmitState((current) =>
      current.status === "success" || current.status === "failure"
        ? { status: "idle" }
        : current,
    );
  }

  function handleAmountChange(value: string) {
    setAmount(value);
    clearSettledSubmitState();
  }

  function handleDescriptionChange(value: string) {
    setDescription(value);
    clearSettledSubmitState();
  }

  function handleQuickCaptureModeChange(mode: QuickCaptureMode) {
    setQuickCaptureMode(mode);
    clearSettledSubmitState();
  }

  function handleBeginVoidCorrection(activityId: string) {
    setVoidState({ status: "confirming", activityId, reason: "" });
  }

  function handleCancelVoidCorrection() {
    setVoidState({ status: "idle" });
  }

  function handleVoidReasonChange(activityId: string, reason: string) {
    setVoidState((current) =>
      current.status === "confirming" && current.activityId === activityId
        ? { status: "confirming", activityId, reason }
        : current,
    );
  }

  async function handleVoidCorrectionSubmit(
    event: FormEvent<HTMLFormElement>,
    activityId: string,
    reason: string,
  ) {
    event.preventDefault();

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setVoidState({
        status: "confirming",
        activityId,
        reason,
        message: "請輸入作廢原因。",
      });
      return;
    }

    if (!UUID_PATTERN.test(activityId)) {
      setVoidState({
        status: "failure",
        message: safeVoidFailureMessage("invalid_activity_reference"),
      });
      return;
    }

    if (!coreConfigReady || !supabase) {
      setVoidState({
        status: "failure",
        message: "執行環境設定不完整，無法送出作廢請求。",
      });
      return;
    }

    const voidFunctionUrl = deriveVoidFunctionUrl(runtimeConfig.functionUrl);
    if (!voidFunctionUrl) {
      setVoidState({
        status: "failure",
        message: "無法找到作廢請求路徑，請檢查 Staging runtime 設定。",
      });
      return;
    }

    setVoidState({ status: "loading", activityId });

    const {
      data: { session: currentSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !currentSession?.access_token) {
      setVoidState({
        status: "failure",
        message: "請先登入 Staging 後再作廢支出。",
      });
      return;
    }

    let response: Response;
    let responseBody: unknown;

    try {
      response = await fetch(voidFunctionUrl, {
        method: "POST",
        headers: {
          apikey: runtimeConfig.publishableKey,
          authorization: `Bearer ${currentSession.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          activity_id: activityId,
          reason: trimmedReason,
        }),
      });

      responseBody = await readSafeJson(response);
    } catch {
      setVoidState({
        status: "failure",
        message: "作廢請求未完成，請檢查 Staging 網路或 runtime 設定。",
      });
      return;
    }

    const isSuccessful =
      response.ok &&
      typeof responseBody === "object" &&
      responseBody !== null &&
      "ok" in responseBody &&
      responseBody.ok === true;

    if (!isSuccessful) {
      const code = extractSafeErrorCode(responseBody);
      setVoidState({
        status: "failure",
        message: safeVoidFailureMessage(code),
      });

      if (code === "activity_already_voided") {
        void loadReviewData();
      }

      return;
    }

    setVoidState({ status: "success", message: VOID_SUCCESS_MESSAGE });
    await loadReviewData();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState({ status: "idle" });

    const trimmedAmount = amount.trim();
    const trimmedDescription = description.trim();
    const requestDate = activityDate || currentLocalDate();
    const modeLabel = quickCaptureModeLabel(quickCaptureMode);
    const selectedRefs = runtimeRefsForMode(runtimeConfig, quickCaptureMode);

    if (!coreConfigReady || !supabase) {
      setSubmitState({
        status: "failure",
        message: "執行環境設定不完整，無法儲存。",
      });
      return;
    }

    if (!currentModeConfigReady) {
      setSubmitState({
        status: "failure",
        message: `${modeLabel}設定不完整，請先補齊缺少的 ${modeLabel} runtime env names。`,
      });
      return;
    }

    if (!isPositiveIntegerAmount(trimmedAmount)) {
      setSubmitState({
        status: "failure",
        message: "請輸入正整數的 TWD 金額。",
      });
      return;
    }

    if (!trimmedDescription) {
      setSubmitState({
        status: "failure",
        message: "請輸入描述後再送出。",
      });
      return;
    }

    setSubmitState({ status: "loading" });

    const {
      data: { session: currentSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !currentSession?.access_token) {
      setSubmitState({
        status: "failure",
        message: `請先登入後再儲存${modeLabel}。`,
      });
      return;
    }

    let response: Response;
    let responseBody: unknown;

    try {
      response = await fetch(runtimeConfig.functionUrl, {
        method: "POST",
        headers: {
          apikey: runtimeConfig.publishableKey,
          authorization: `Bearer ${currentSession.access_token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          activity_date: requestDate,
          movement_type: quickCaptureMode,
          amount: trimmedAmount,
          currency: "TWD",
          account_id: selectedRefs.accountId,
          category_id: selectedRefs.categoryId,
          description: trimmedDescription,
        }),
      });

      responseBody = await readSafeJson(response);
    } catch {
      setSubmitState({
        status: "failure",
        message: REQUEST_FAILURE_MESSAGE,
      });
      return;
    }

    const isSuccessful =
      response.ok &&
      typeof responseBody === "object" &&
      responseBody !== null &&
      "ok" in responseBody &&
      responseBody.ok === true;

    if (!isSuccessful) {
      const code = extractSafeErrorCode(responseBody);
      setSubmitState({
        status: "failure",
        message: safeFailureMessage(code, quickCaptureMode),
      });
      return;
    }

    setAmount("");
    setDescription("");
    setActivityDate(currentLocalDate());
    setSubmitState({
      status: "success",
      activityDate: requestDate,
      amount: trimmedAmount,
      description: trimmedDescription,
      movementType: quickCaptureMode,
    });
    void loadReviewData();
  }

  const quickCaptureLabel = quickCaptureModeLabel(quickCaptureMode);

  return (
    <main className="app-shell" aria-labelledby="page-title">
      <section className="entry-panel">
        <div className="page-heading">
          <p className="eyebrow">Staging 快速輸入</p>
          <h1 id="page-title">財務快速記錄</h1>
          <p className="summary">
            支出為預設，可切換收入；每次送出一筆整數 TWD 紀錄。
          </p>
        </div>

        <div className="setup-stack" aria-label="Staging 設定與登入狀態">
          <RuntimeReadiness
            configured={runtimeReady}
            items={runtimeStatusItems}
          />

          <section className="auth-section" aria-labelledby="auth-title">
            <div className="section-heading">
              <h2 id="auth-title">Staging 登入</h2>
              <SessionStatus status={authStatus} hasSession={Boolean(session)} />
            </div>

            {authStatus === "signed_in" ? (
              <button
                className="secondary-button"
                disabled={authLoading}
                onClick={handleSignOut}
                type="button"
              >
                {authLoading ? "登出中..." : "登出"}
              </button>
            ) : (
              <form className="auth-form" onSubmit={handleSignIn}>
                <label className="field">
                  <span>電子郵件</span>
                  <input
                    autoComplete="email"
                    inputMode="email"
                    name="email"
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="staging 操作員信箱"
                    required
                    type="email"
                    value={email}
                  />
                </label>

                <label className="field">
                  <span>密碼</span>
                  <input
                    autoComplete="current-password"
                    name="password"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="staging 密碼"
                    required
                    type="password"
                    value={password}
                  />
                </label>

                <button
                  className="submit-button"
                  disabled={authLoading || !coreConfigReady}
                  type="submit"
                >
                  {authLoading ? "登入中..." : "登入"}
                </button>
              </form>
            )}

            <AuthMessageView message={authMessage} />
          </section>
        </div>

        <div className="quick-capture-block" aria-label="快速財務輸入">
          <form className="entry-form" onSubmit={handleSubmit}>
            <div
              className="mode-control"
              role="radiogroup"
              aria-label="快速輸入模式"
            >
              <span>記錄類型</span>
              <div className="mode-options">
                {(["expense", "income"] as const).map((mode) => (
                  <button
                    aria-checked={quickCaptureMode === mode}
                    className={`mode-option ${
                      quickCaptureMode === mode ? "mode-option-active" : ""
                    }`}
                    disabled={submitState.status === "loading"}
                    key={mode}
                    onClick={() => handleQuickCaptureModeChange(mode)}
                    role="radio"
                    type="button"
                  >
                    {quickCaptureModeLabel(mode)}
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
                onChange={(event) => handleAmountChange(event.target.value)}
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
                onChange={(event) => handleDescriptionChange(event.target.value)}
                placeholder={`簡短${quickCaptureLabel}備註`}
                required
                rows={4}
                value={description}
              />
            </label>

            <div className="fixed-details" aria-label="提交明細">
              <span>{quickCaptureLabel}</span>
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
                ? `請先完成${quickCaptureLabel}設定`
                : authStatus === "signed_in"
                ? `儲存${quickCaptureLabel}`
                : "請先登入後儲存"}
            </button>
          </form>

          <StatusMessage
            coreConfigReady={coreConfigReady}
            mode={quickCaptureMode}
            modeConfigReady={currentModeConfigReady}
            state={submitState}
          />
        </div>
      </section>

      <FinanceReviewPanel
        canLoad={coreConfigReady && authStatus === "signed_in"}
        endDate={reviewEndDate}
        movementFilter={movementFilter}
        onBeginVoidCorrection={handleBeginVoidCorrection}
        onCancelVoidCorrection={handleCancelVoidCorrection}
        onEndDateChange={setReviewEndDate}
        onMovementFilterChange={setMovementFilter}
        onRefresh={() => void loadReviewData()}
        onStartDateChange={setReviewStartDate}
        onVoidCorrectionSubmit={handleVoidCorrectionSubmit}
        onVoidReasonChange={handleVoidReasonChange}
        onToggleVoidAudit={() => setShowVoidAudit((current) => !current)}
        reviewState={reviewState}
        showVoidAudit={showVoidAudit}
        startDate={reviewStartDate}
        voidState={voidState}
      />
    </main>
  );
}

function RuntimeReadiness({
  configured,
  items,
}: {
  configured: boolean;
  items: RuntimeStatusItem[];
}) {
  return (
    <section className="runtime-section" aria-labelledby="runtime-title">
      <div className="section-heading">
        <h2 id="runtime-title">執行環境狀態</h2>
        <p
          className={`session-status ${
            configured ? "session-ready" : "session-warning"
          }`}
        >
          {configured ? "已設定" : "缺少"}
        </p>
      </div>

      <p className="runtime-note">
        值保留於 apps/web/.env.local，不會顯示在此畫面。
      </p>

      <ul className="runtime-list" aria-label="執行環境狀態">
        {items.map((item) => (
          <li key={item.name}>
            <code>{item.name}</code>
            <span
              className={`runtime-state ${
                item.configured ? "runtime-ready" : "runtime-missing"
              }`}
            >
              {item.configured ? "已設定" : "缺少"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SessionStatus({
  status,
  hasSession,
}: {
  status: AuthStatus;
  hasSession: boolean;
}) {
  if (status === "checking") {
    return <p className="session-status">檢查中</p>;
  }

  if (status === "signed_in" && hasSession) {
    return <p className="session-status session-ready">已登入</p>;
  }

  return <p className="session-status">已登出</p>;
}

function AuthMessageView({ message }: { message: AuthMessage | null }) {
  if (!message) {
    return null;
  }

  return (
    <p
      className={`status-message ${
        message.status === "success" ? "status-success" : "status-error"
      }`}
      role={message.status === "success" ? "status" : "alert"}
    >
      {message.message}
    </p>
  );
}

function StatusMessage({
  coreConfigReady,
  mode,
  modeConfigReady,
  state,
}: {
  coreConfigReady: boolean;
  mode: QuickCaptureMode;
  modeConfigReady: boolean;
  state: SubmitState;
}) {
  const label = quickCaptureModeLabel(mode);

  if (!coreConfigReady) {
    return (
      <p className="status-message status-warning" role="status">
        執行環境設定不完整，送出前先補齊缺少的環境設定名稱。
      </p>
    );
  }

  if (!modeConfigReady) {
    return (
      <p className="status-message status-warning" role="status">
        {label}設定不完整，送出前先補齊缺少的 {label} runtime env names。
      </p>
    );
  }

  if (state.status === "loading") {
    return (
      <p className="status-message" role="status">
        儲存{label}中...
      </p>
    );
  }

  if (state.status === "success") {
    const savedLabel = quickCaptureModeLabel(state.movementType);

    return (
      <p className="status-message status-success" role="status">
        已儲存{savedLabel}：{state.activityDate}，TWD {state.amount}，
        {state.description}。
        可直接輸入下一筆。
      </p>
    );
  }

  if (state.status === "failure") {
    return (
      <p className="status-message status-error" role="alert">
        {state.message}
      </p>
    );
  }

  return (
    <p className="status-message status-muted" role="status">
      可直接輸入一筆{label}。
    </p>
  );
}

function FinanceReviewPanel({
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

function ReviewDashboardStrip({
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

function ReviewStateStrip({
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

function ReviewContent({
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

function TotalList({
  emptyLabel,
  totals,
}: {
  emptyLabel: string;
  totals: TotalLine[];
}) {
  if (totals.length === 0) {
    return <p className="empty-state">{emptyLabel}</p>;
  }

  return (
    <ul className="total-list">
      {totals.map((total) => (
        <li key={`${total.label}-${total.currency}`}>
          <span>{total.label}</span>
          <strong>{formatAmount(total.amount, total.currency)}</strong>
        </li>
      ))}
    </ul>
  );
}
