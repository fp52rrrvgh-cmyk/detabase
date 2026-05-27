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
  groupingPurpose: string | null;
  parentId: string | null;
};

export type AccountOption = {
  id: string;
  display_name: string;
  account_type: string;
  initial_balance: number;
  is_active: boolean;
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
  categoryUsage: Record<string, number>;
  accountId: string;
  accounts: AccountOption[];
  setAmount: (v: string) => void;
  setDescription: (v: string) => void;
  setActivityDate: (v: string) => void;
  setQuickCaptureMode: (v: QuickCaptureMode) => void;
  setCategoryId: (v: string) => void;
  setAccountId: (v: string) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  clearSettledSubmitState: () => void;
};

export function useQuickCapture(
  supabase: ReturnType<typeof import("@supabase/supabase-js").createClient> | null,
  coreConfigReady: boolean,
  authStatus: string,
  session: import("@supabase/supabase-js").Session | null,
  onSuccess?: () => void,
): UseQuickCaptureReturn {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDateState] = useState(currentLocalDate);
  const [quickCaptureMode, setQuickCaptureMode] = useState<QuickCaptureMode>("expense");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoryUsage, setCategoryUsage] = useState<Record<string, number>>({});
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  // ── Classification rule matching ──
  useEffect(() => {
    const trimmed = description.trim();
    if (!trimmed) return;
    const funcUrl = runtimeConfig.supabaseFunctionsUrl;
    if (!funcUrl) return;

    const timer = setTimeout(async () => {
      const client =
        runtimeConfig.supabaseUrl && runtimeConfig.publishableKey
          ? createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey)
          : null;
      if (!client) return;

      let sessionToken = "";
      try {
        const { data } = await client.auth.getSession();
        sessionToken = data.session?.access_token ?? "";
      } catch {
        return;
      }
      if (!sessionToken) return;

      try {
        const resp = await fetch(
          funcUrl + "/classify-transaction",
          {
            method: "POST",
            headers: {
              apikey: runtimeConfig.publishableKey,
              authorization: `Bearer ${sessionToken}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({ description: trimmed }),
          },
        );
        if (!resp.ok) return;
        const body = await resp.json();
        if (!body.ok || !body.data?.match) return;

        const match = body.data.match;
        if (match.categoryId && match.categoryId !== categoryId && (categoryId === "" || categoryId === "none")) {
          setCategoryId(match.categoryId);
        }
        if (match.accountId && match.accountId !== accountId && accountId === "") {
          setAccountId(match.accountId);
        }
        if (match.movementType && match.movementType !== quickCaptureMode) {
          setQuickCaptureMode(match.movementType as QuickCaptureMode);
        }
      } catch {
        // Silently ignore — classification is best-effort
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [description, categoryId, accountId, quickCaptureMode]);

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
        .select("id,display_name,grouping_purpose,parent_id")
        .eq("is_active", true)
        .order("display_name", { ascending: true })
        .limit(500)
        .then(({ data: rows }) => {
          if (cancelled) return;
          const list = ((rows ?? []) as { id: string; display_name: string; grouping_purpose: string | null; parent_id: string | null }[]).map(
            (r) => ({ id: r.id, label: r.display_name, groupingPurpose: r.grouping_purpose, parentId: r.parent_id }),
          );
          setCategories(list);
        });
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  // Load category usage counts (last 90 days) for smart sorting
  useEffect(() => {
    const cli = runtimeConfig.supabaseUrl && runtimeConfig.publishableKey
      ? createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey)
      : null;
    if (!cli) return;
    let cancelled = false;
    cli.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session) return;
      const ago = new Date();
      ago.setDate(ago.getDate() - 90);
      cli.from("finance_activities").select("category_id")
        .gte("transaction_date", ago.toISOString().split("T")[0])
        .then(({ data: rows }) => {
          if (cancelled) return;
          const cnt: Record<string, number> = {};
          for (const r of (rows ?? []) as { category_id: string }[]) {
            if (r.category_id) cnt[r.category_id] = (cnt[r.category_id] ?? 0) + 1;
          }
          setCategoryUsage(cnt);
        });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Load accounts + restore last used account
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
        .from("finance_accounts")
        .select("id,display_name,account_type,initial_balance,is_active")
        .eq("is_active", true)
        .order("display_name", { ascending: true })
        .limit(100)
        .then(({ data: rows }) => {
          if (cancelled) return;
          const list = ((rows ?? []) as { id: string; display_name: string; account_type: string; initial_balance: number; is_active: boolean }[]).map(
            (r) => ({ id: r.id, display_name: r.display_name, account_type: r.account_type, initial_balance: r.initial_balance, is_active: r.is_active }),
          );
          setAccounts(list);
          try {
            const saved = localStorage.getItem("xiaoma_last_account_id");
            if (saved && list.some((a) => a.id === saved)) {
              setAccountId(saved);
            }
          } catch { /* ignore */ }
        });
    }).catch(() => {});

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
            account_id: accountId || selectedRefs.accountId,
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
      if (accountId) {
        try { localStorage.setItem("xiaoma_last_account_id", accountId); } catch { /* ignore */ }
      }
      setSubmitState({
        status: "success",
        activityDate: requestDate,
        amount: trimmedAmount,
        description: trimmedDescription,
        movementType: quickCaptureMode,
      });
      onSuccess?.();
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
    categoryUsage,
    accountId,
    accounts,
    setAmount: handleAmountChange,
    setDescription: handleDescriptionChange,
    setActivityDate: setActivityDateState,
    setQuickCaptureMode: handleQuickCaptureModeChange,
    setCategoryId,
    setAccountId,
    handleSubmit,
    clearSettledSubmitState,
  };
}
