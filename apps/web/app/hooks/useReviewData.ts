import type { Session } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { CorrectionRow, FinanceActivityRow, MovementFilter, ReferenceRow, ReviewState, VoidCorrectionState } from "../types";

import { createClient } from "@supabase/supabase-js";

import { runtimeConfig, REVIEW_FAILURE_MESSAGE, UUID_PATTERN, VOID_SUCCESS_MESSAGE } from "../constants";
import { defaultReviewDateRange } from "../lib/date";
import { deriveVoidFunctionUrl, extractSafeErrorCode, readSafeJson, safeVoidFailureMessage } from "../lib/errors";
import { buildReviewData } from "../lib/review";

export type UseReviewDataReturn = {
  reviewStartDate: string;
  reviewEndDate: string;
  movementFilter: MovementFilter;
  reviewState: ReviewState;
  showVoidAudit: boolean;
  voidState: VoidCorrectionState;
  setReviewStartDate: (v: string) => void;
  setReviewEndDate: (v: string) => void;
  setMovementFilter: (v: MovementFilter) => void;
  setShowVoidAudit: (v: boolean) => void;
  loadReviewData: () => Promise<void>;
  handleBeginVoidCorrection: (activityId: string) => void;
  handleCancelVoidCorrection: () => void;
  handleVoidReasonChange: (activityId: string, reason: string) => void;
  handleVoidCorrectionSubmit: (event: FormEvent<HTMLFormElement>, activityId: string, reason: string) => void;
};

export function useReviewData(
  supabase: ReturnType<typeof createClient> | null,
  coreConfigReady: boolean,
  authStatus: string,
  session: Session | null,
): UseReviewDataReturn {
  const defaultRange = useMemo(() => defaultReviewDateRange(), []);
  const [reviewStartDate, setReviewStartDate] = useState(defaultRange.startDate);
  const [reviewEndDate, setReviewEndDate] = useState(defaultRange.endDate);
  const [movementFilter, setMovementFilter] = useState<MovementFilter>("all");
  const [reviewState, setReviewState] = useState<ReviewState>({ status: "idle" });
  const [showVoidAudit, setShowVoidAudit] = useState(false);
  const [voidState, setVoidState] = useState<VoidCorrectionState>({ status: "idle" });

  const loadReviewData = useCallback(async () => {
    if (!coreConfigReady || !supabase || authStatus !== "signed_in" || !session) {
      setReviewState({ status: "idle" });
      return;
    }

    if (!reviewStartDate || !reviewEndDate || reviewStartDate > reviewEndDate) {
      setReviewState({ status: "failure", message: "請選擇有效的檢視日期區間。" });
      return;
    }

    setReviewState({ status: "loading" });

    const {
      data: { session: currentSession },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !currentSession) {
      setReviewState({ status: "failure", message: "請先登入再載入檢視資料。" });
      return;
    }

    let activityQuery = supabase
      .from("finance_activities")
      .select("id,activity_date,movement_type,amount,currency,account_id,category_id,description,created_at")
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
      setReviewState({ status: "failure", message: REVIEW_FAILURE_MESSAGE });
      return;
    }

    const activities = (activityResult.data ?? []) as FinanceActivityRow[];
    const activityIds = activities.map((activity) => activity.id);

    let correctionResult:
      | { data: unknown[] | null; error: { message: string } | null }
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
      supabase.from("finance_accounts").select("id,display_name").order("display_name", { ascending: true }).limit(500),
      supabase.from("finance_categories").select("id,display_name").order("display_name", { ascending: true }).limit(500),
    ]);

    if (correctionResult?.error || accountResult.error || categoryResult.error) {
      setReviewState({ status: "failure", message: REVIEW_FAILURE_MESSAGE });
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
  }, [authStatus, coreConfigReady, movementFilter, reviewEndDate, reviewStartDate, session, supabase]);

  useEffect(() => {
    if (authStatus === "signed_in" && session && coreConfigReady) {
      void loadReviewData();
      return;
    }
    setReviewState({ status: "idle" });
  }, [authStatus, coreConfigReady, loadReviewData, session]);

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

  const handleVoidCorrectionSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>, activityId: string, reason: string) => {
      event.preventDefault();

      const trimmedReason = reason.trim();
      if (!trimmedReason) {
        setVoidState({ status: "confirming", activityId, reason, message: "請輸入作廢原因。" });
        return;
      }

      if (!UUID_PATTERN.test(activityId)) {
        setVoidState({ status: "failure", message: safeVoidFailureMessage("invalid_activity_reference") });
        return;
      }

      if (!coreConfigReady || !supabase) {
        setVoidState({ status: "failure", message: "執行環境設定不完整，無法送出作廢請求。" });
        return;
      }

      const voidFunctionUrl = deriveVoidFunctionUrl(runtimeConfig.functionUrl);
      if (!voidFunctionUrl) {
        setVoidState({ status: "failure", message: "無法找到作廢請求路徑，請檢查 Staging runtime 設定。" });
        return;
      }

      setVoidState({ status: "loading", activityId });

      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !currentSession?.access_token) {
        setVoidState({ status: "failure", message: "請先登入 Staging 後再作廢支出。" });
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
        setVoidState({ status: "failure", message: "作廢請求未完成，請檢查 Staging 網路或 runtime 設定。" });
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
        setVoidState({ status: "failure", message: safeVoidFailureMessage(code) });
        if (code === "activity_already_voided") {
          void loadReviewData();
        }
        return;
      }

      setVoidState({ status: "success", message: VOID_SUCCESS_MESSAGE });
      await loadReviewData();
    },
    [coreConfigReady, loadReviewData, supabase],
  );

  return {
    reviewStartDate,
    reviewEndDate,
    movementFilter,
    reviewState,
    showVoidAudit,
    voidState,
    setReviewStartDate,
    setReviewEndDate,
    setMovementFilter,
    setShowVoidAudit,
    loadReviewData,
    handleBeginVoidCorrection,
    handleCancelVoidCorrection,
    handleVoidReasonChange,
    handleVoidCorrectionSubmit,
  };
}
