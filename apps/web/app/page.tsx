"use client";

export const dynamic = "force-dynamic";

import { createClient, type Session } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  AuthMessage,
  AuthStatus,
  CorrectionRow,
  FinanceActivityRow,
  MovementFilter,
  QuickCaptureMode,
  ReferenceRow,
  ReviewData,
  ReviewState,
  RuntimeConfig,
  SubmitState,
  VoidCorrectionState,
} from "./types";

import {
  CORE_RUNTIME_KEYS,
  EXPENSE_RUNTIME_KEYS,
  INCOME_RUNTIME_KEYS,
  REQUEST_FAILURE_MESSAGE,
  REVIEW_FAILURE_MESSAGE,
  UUID_PATTERN,
  VOID_SUCCESS_MESSAGE,
  runtimeConfig,
} from "./constants";

import {
  currentLocalDate,
  defaultReviewDateRange,
} from "./lib/date";

import {
  formatAmount,
  isPositiveIntegerAmount,
  quickCaptureModeLabel,
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

import {
  activeReviewActivities,
  buildReviewData,
  sumAmountsByDateRange,
  summarizeTopCategoryTotals,
  summarizeTotals,
} from "./lib/review";

import { AuthMessageView } from "./components/AuthMessageView";
import { FinanceReviewPanel } from "./components/FinanceReviewPanel";
import { RuntimeReadiness } from "./components/RuntimeReadiness";
import { SessionStatus } from "./components/SessionStatus";
import { StatusMessage } from "./components/StatusMessage";
import { TotalList } from "./components/TotalList";

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
