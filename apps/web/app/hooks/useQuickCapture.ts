import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import type { QuickCaptureMode, SubmitState } from "../types";

import { runtimeConfig, EXPENSE_RUNTIME_KEYS, INCOME_RUNTIME_KEYS } from "../constants";
import { currentLocalDate } from "../lib/date";
import { isPositiveIntegerAmount, quickCaptureModeLabel } from "../lib/format";
import { hasRuntimeFields, runtimeRefsForMode } from "../lib/runtime";
import { readSafeJson, extractSafeErrorCode, safeFailureMessage } from "../lib/errors";
import { REQUEST_FAILURE_MESSAGE } from "../constants";

export type CategoryOption = {
  id: string;
  label: string;
};

export type UseQuickCaptureReturn = {
  amount: string;
  description: string;
  activityDate: string;
  quickCaptureMode: QuickCaptureMode;
  submitState: SubmitState;
  currentModeConfigReady: boolean;
  categoryId: string;
  categories: CategoryOption[];
  setAmount: (v: string) => void;
  setDescription: (v: string) => void;
  setActivityDate: (v: string) => void;
  setQuickCaptureMode: (v: QuickCaptureMode) => void;
  setCategoryId: (v: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  clearSettledSubmitState: () => void;
};

export function useQuickCapture(
  supabase: ReturnType<typeof import("@supabase/supabase-js").createClient> | null,
  coreConfigReady: boolean,
  authStatus: string,
  session: import("@supabase/supabase-js").Session | null,
  onSuccess: () => void,
): UseQuickCaptureReturn {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDateState] = useState(currentLocalDate);
  const [quickCaptureMode, setQuickCaptureMode] = useState<QuickCaptureMode>("expense");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  const expenseConfigReady = hasRuntimeFields(runtimeConfig, EXPENSE_RUNTIME_KEYS);
  const incomeConfigReady = hasRuntimeFields(runtimeConfig, INCOME_RUNTIME_KEYS);
  const currentModeConfigReady =
    quickCaptureMode === "income" ? incomeConfigReady : expenseConfigReady;

  // Load categories
  useEffect(() => {
    const supabase =
      runtimeConfig.supabaseUrl && runtimeConfig.publishableKey
        ? createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey)
        : null;
    if (!supabase) return;

    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      supabase
        .from("finance_categories")
        .select("id,display_name,grouping_purpose")
        .eq("is_active", true)
        .order("display_name", { ascending: true })
        .limit(500)
        .then(({ data: rows }) => {
          if (cancelled) return;
          const list = ((rows ?? []) as { id: string; display_name: string }[]).map(
            (r) => ({ id: r.id, label: r.display_name }),
          );
          setCategories(list);
        });
    });

    return () => { cancelled = true; };
  }, []);

  const clearSettledSubmitState = useCallback(() => {
    setSubmitState((current) =>
      current.status === "success" || current.status === "failure"
        ? { status: "idle" }
        : current,
    );
  }, []);

  const handleAmountChange = useCallback((value: string) => {
    setAmount(value);
    clearSettledSubmitState();
  }, [clearSettledSubmitState]);

  const handleDescriptionChange = useCallback((value: string) => {
    setDescription(value);
    clearSettledSubmitState();
  }, [clearSettledSubmitState]);

  const handleQuickCaptureModeChange = useCallback((mode: QuickCaptureMode) => {
    setQuickCaptureMode(mode);
    clearSettledSubmitState();
  }, [clearSettledSubmitState]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
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
            category_id: categoryId && categoryId !== "none" ? categoryId : selectedRefs.categoryId,
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
      setActivityDateState(currentLocalDate());
      setSubmitState({
        status: "success",
        activityDate: requestDate,
        amount: trimmedAmount,
        description: trimmedDescription,
        movementType: quickCaptureMode,
      });
      onSuccess();
    },
    [activityDate, amount, categoryId, coreConfigReady, currentModeConfigReady, description, onSuccess, quickCaptureMode, supabase],
  );

  return {
    amount,
    description,
    activityDate,
    quickCaptureMode,
    submitState,
    currentModeConfigReady,
    categoryId: categoryId || "none",
    categories,
    setAmount: handleAmountChange,
    setDescription: handleDescriptionChange,
    setActivityDate: setActivityDateState,
    setQuickCaptureMode: handleQuickCaptureModeChange,
    setCategoryId,
    handleSubmit,
    clearSettledSubmitState,
  };
}
