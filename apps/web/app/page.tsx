"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type SubmitState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      activityDate: string;
      amount: string;
      description: string;
    }
  | { status: "failure"; message: string };

type AuthStatus = "checking" | "signed_out" | "signed_in";
type AuthMessage =
  | { status: "success"; message: string }
  | { status: "failure"; message: string };

type RuntimeConfig = {
  supabaseUrl: string;
  publishableKey: string;
  functionUrl: string;
  accountId: string;
  categoryId: string;
};

type RuntimeStatusItem = {
  name: string;
  configured: boolean;
};

type MovementType = "income" | "expense" | "transfer" | "adjustment";
type MovementFilter = "all" | MovementType;

type FinanceActivityRow = {
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

type ReferenceRow = {
  id: string;
  display_name: string | null;
};

type CorrectionRow = {
  activity_id: string | null;
  correction_type: string | null;
};

type DisplayActivity = {
  activityDate: string;
  movementType: string;
  amount: number;
  currency: string;
  accountName: string;
  categoryName: string;
  description: string;
  createdAt: string | null;
};

type TotalLine = {
  label: string;
  currency: string;
  amount: number;
};

type ReviewData = {
  activities: DisplayActivity[];
  dateRangeTotals: TotalLine[];
  movementTotals: TotalLine[];
  categoryTotals: TotalLine[];
  accountTotals: TotalLine[];
};

type ReviewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ReviewData }
  | { status: "failure"; message: string };

const RUNTIME_ENVIRONMENT_FIELDS: Array<{
  name: string;
  key: keyof RuntimeConfig;
}> = [
  { name: "NEXT_PUBLIC_SUPABASE_URL", key: "supabaseUrl" },
  { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", key: "publishableKey" },
  { name: "NEXT_PUBLIC_FINANCE_FUNCTION_URL", key: "functionUrl" },
  { name: "NEXT_PUBLIC_DEFAULT_EXPENSE_ACCOUNT_ID", key: "accountId" },
  { name: "NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID", key: "categoryId" },
];

const REQUEST_FAILURE_MESSAGE =
  "Expense was not saved. Network or runtime request failed; inspect staging setup locally.";
const REVIEW_FAILURE_MESSAGE =
  "Review data could not be loaded. Inspect staging read-only access locally.";
const MOVEMENT_FILTER_OPTIONS: Array<{ value: MovementFilter; label: string }> = [
  { value: "all", label: "All movement types" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
  { value: "transfer", label: "Transfer" },
  { value: "adjustment", label: "Adjustment" },
];

const runtimeConfig: RuntimeConfig = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  functionUrl: process.env.NEXT_PUBLIC_FINANCE_FUNCTION_URL ?? "",
  accountId: process.env.NEXT_PUBLIC_DEFAULT_EXPENSE_ACCOUNT_ID ?? "",
  categoryId: process.env.NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID ?? "",
};

function currentLocalDate(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function localDateDaysAgo(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() - days);
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function defaultReviewDateRange() {
  return {
    startDate: localDateDaysAgo(30),
    endDate: currentLocalDate(),
  };
}

function hasRuntimeConfig(config: RuntimeConfig): boolean {
  return Object.values(config).every((value) => value.trim().length > 0);
}

function runtimeEnvironmentStatus(config: RuntimeConfig): RuntimeStatusItem[] {
  return RUNTIME_ENVIRONMENT_FIELDS.map(({ name, key }) => ({
    name,
    configured: config[key].trim().length > 0,
  }));
}

function isPositiveIntegerAmount(value: string): boolean {
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return false;
  }

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0;
}

function extractSafeErrorCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null || !("error" in body)) {
    return null;
  }

  const error = (body as { error?: unknown }).error;
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  if (typeof code !== "string" || !/^[a-z0-9_:-]{1,64}$/i.test(code)) {
    return null;
  }

  return code;
}

function safeFailureMessage(code: string | null): string {
  switch (code) {
    case "invalid_account_reference":
      return "Expense was not saved. Check NEXT_PUBLIC_DEFAULT_EXPENSE_ACCOUNT_ID in apps/web/.env.local against an active same-owner staging account.";
    case "invalid_category_reference":
      return "Expense was not saved. Check NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID in apps/web/.env.local against an active same-owner staging expense category.";
    case "category_movement_mismatch":
      return "Expense was not saved. Check that NEXT_PUBLIC_DEFAULT_EXPENSE_CATEGORY_ID points to an active same-owner staging expense category.";
    default:
      return code
        ? `Expense was not saved. Safe error: ${code}. Inspect staging setup locally.`
        : "Expense was not saved. Inspect staging separately if needed.";
  }
}

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

function normalizeAmount(value: string | number): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function safeReferenceLabel(
  references: Map<string, string>,
  id: string | null,
  fallback: string,
): string {
  if (!id) {
    return fallback;
  }

  return references.get(id) ?? "Unavailable reference";
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
}

function formatOptionalTimestamp(value: string | null): string {
  if (!value) {
    return "Not shown";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Not shown";
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
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
  accounts: ReferenceRow[],
  categories: ReferenceRow[],
): ReviewData {
  const accountNames = new Map(
    accounts.map((account) => [
      account.id,
      account.display_name?.trim() || "Unnamed account",
    ]),
  );
  const categoryNames = new Map(
    categories.map((category) => [
      category.id,
      category.display_name?.trim() || "Unnamed category",
    ]),
  );

  return {
    activities: activities.slice(0, 25).map((activity) => ({
      activityDate: activity.activity_date,
      movementType: activity.movement_type,
      amount: normalizeAmount(activity.amount),
      currency: activity.currency || "TWD",
      accountName: safeReferenceLabel(
        accountNames,
        activity.account_id,
        "No account",
      ),
      categoryName: safeReferenceLabel(
        categoryNames,
        activity.category_id,
        "No category",
      ),
      description: activity.description?.trim() || "No description",
      createdAt: activity.created_at,
    })),
    dateRangeTotals: summarizeTotals(activities, () => "Selected range"),
    movementTotals: summarizeTotals(
      activities,
      (activity) => activity.movement_type || "Unknown movement",
    ),
    categoryTotals: summarizeTotals(activities, (activity) =>
      safeReferenceLabel(categoryNames, activity.category_id, "No category"),
    ),
    accountTotals: summarizeTotals(activities, (activity) =>
      safeReferenceLabel(accountNames, activity.account_id, "No account"),
    ),
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

  const configReady = hasRuntimeConfig(runtimeConfig);
  const runtimeStatusItems = runtimeEnvironmentStatus(runtimeConfig);
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
          message: "Session status could not be checked safely.",
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
    if (!configReady || !supabase || authStatus !== "signed_in" || !session) {
      setReviewState({ status: "idle" });
      return;
    }

    if (!reviewStartDate || !reviewEndDate || reviewStartDate > reviewEndDate) {
      setReviewState({
        status: "failure",
        message: "Choose a valid review date range.",
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
        message: "Sign in before loading review data.",
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
        .select("activity_id,correction_type")
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
        activeReviewActivities(
          activities,
          (correctionResult?.data ?? []) as CorrectionRow[],
        ),
        (accountResult.data ?? []) as ReferenceRow[],
        (categoryResult.data ?? []) as ReferenceRow[],
      ),
    });
  }, [
    authStatus,
    configReady,
    movementFilter,
    reviewEndDate,
    reviewStartDate,
    session,
    supabase,
  ]);

  useEffect(() => {
    if (authStatus === "signed_in" && session && configReady) {
      void loadReviewData();
      return;
    }

    setReviewState({ status: "idle" });
  }, [authStatus, configReady, loadReviewData, session]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage(null);

    const trimmedEmail = email.trim();
    if (!configReady || !supabase) {
      setAuthMessage({
        status: "failure",
        message: "Runtime configuration is incomplete.",
      });
      return;
    }

    if (!trimmedEmail || !password) {
      setAuthMessage({
        status: "failure",
        message: "Enter staging email and password.",
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
        message: "Sign in failed. Check staging credentials locally.",
      });
      return;
    }

    setPassword("");
    setSession(data.session);
    setAuthStatus("signed_in");
    setAuthMessage({
      status: "success",
      message: "Signed in for staging expense entry.",
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
        message: "Sign out failed. Retry locally.",
      });
      return;
    }

    setSession(null);
    setAuthStatus("signed_out");
    setSubmitState({ status: "idle" });
    setReviewState({ status: "idle" });
    setAuthMessage({
      status: "success",
      message: "Signed out.",
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState({ status: "idle" });

    const trimmedAmount = amount.trim();
    const trimmedDescription = description.trim();
    const requestDate = activityDate || currentLocalDate();

    if (!configReady || !supabase) {
      setSubmitState({
        status: "failure",
        message: "Runtime configuration is incomplete.",
      });
      return;
    }

    if (!isPositiveIntegerAmount(trimmedAmount)) {
      setSubmitState({
        status: "failure",
        message: "Enter a positive whole TWD amount before submitting.",
      });
      return;
    }

    if (!trimmedDescription) {
      setSubmitState({
        status: "failure",
        message: "Enter a description before submitting.",
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
        message: "Sign in before saving an expense.",
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
          movement_type: "expense",
          amount: trimmedAmount,
          currency: "TWD",
          account_id: runtimeConfig.accountId,
          category_id: runtimeConfig.categoryId,
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
        message: safeFailureMessage(code),
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
    });
    void loadReviewData();
  }

  return (
    <main className="app-shell" aria-labelledby="page-title">
      <section className="entry-panel">
        <div className="page-heading">
          <p className="eyebrow">Staging expense entry</p>
          <h1 id="page-title">Finance expense entry</h1>
          <p className="summary">
            Record one whole TWD expense through the staging ingestion endpoint.
          </p>
        </div>

        <RuntimeReadiness
          configured={configReady}
          items={runtimeStatusItems}
        />

        <section className="auth-section" aria-labelledby="auth-title">
          <div className="section-heading">
            <h2 id="auth-title">Staging sign in</h2>
            <SessionStatus status={authStatus} hasSession={Boolean(session)} />
          </div>

          {authStatus === "signed_in" ? (
            <button
              className="secondary-button"
              disabled={authLoading}
              onClick={handleSignOut}
              type="button"
            >
              {authLoading ? "Signing out..." : "Sign out"}
            </button>
          ) : (
            <form className="auth-form" onSubmit={handleSignIn}>
              <label className="field">
                <span>Email</span>
                <input
                  autoComplete="email"
                  inputMode="email"
                  name="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="staging operator email"
                  required
                  type="email"
                  value={email}
                />
              </label>

              <label className="field">
                <span>Password</span>
                <input
                  autoComplete="current-password"
                  name="password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="staging password"
                  required
                  type="password"
                  value={password}
                />
              </label>

              <button
                className="submit-button"
                disabled={authLoading || !configReady}
                type="submit"
              >
                {authLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>
          )}

          <AuthMessageView message={authMessage} />
        </section>

        <form className="entry-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Amount</span>
            <input
              inputMode="numeric"
              min="1"
              name="amount"
              onChange={(event) => handleAmountChange(event.target.value)}
              placeholder="100"
              required
              step="1"
              title="Enter a positive whole TWD amount."
              type="number"
              value={amount}
            />
          </label>

          <label className="field">
            <span>Description</span>
            <textarea
              name="description"
              onChange={(event) => handleDescriptionChange(event.target.value)}
              placeholder="Short expense note"
              required
              rows={4}
              value={description}
            />
          </label>

          <div className="fixed-details" aria-label="Fixed request details">
            <span>Expense</span>
            <span>TWD</span>
            <span>{activityDate || "Current local date"}</span>
          </div>

          <button
            className="submit-button"
            disabled={
              submitState.status === "loading" ||
              authStatus !== "signed_in" ||
              !configReady
            }
            type="submit"
          >
            {submitState.status === "loading"
              ? "Saving..."
              : !configReady
              ? "Complete runtime setup"
              : authStatus === "signed_in"
              ? "Save expense"
              : "Sign in to save"}
          </button>
        </form>

        <StatusMessage state={submitState} configReady={configReady} />
      </section>

      <FinanceReviewPanel
        canLoad={configReady && authStatus === "signed_in"}
        endDate={reviewEndDate}
        movementFilter={movementFilter}
        onEndDateChange={setReviewEndDate}
        onMovementFilterChange={setMovementFilter}
        onRefresh={() => void loadReviewData()}
        onStartDateChange={setReviewStartDate}
        reviewState={reviewState}
        startDate={reviewStartDate}
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
        <h2 id="runtime-title">Runtime readiness</h2>
        <p
          className={`session-status ${
            configured ? "session-ready" : "session-warning"
          }`}
        >
          {configured ? "Configured" : "Missing"}
        </p>
      </div>

      <p className="runtime-note">
        Values stay local in apps/web/.env.local and are not displayed here.
      </p>

      <ul className="runtime-list" aria-label="Runtime environment status">
        {items.map((item) => (
          <li key={item.name}>
            <code>{item.name}</code>
            <span
              className={`runtime-state ${
                item.configured ? "runtime-ready" : "runtime-missing"
              }`}
            >
              {item.configured ? "Configured" : "Missing"}
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
    return <p className="session-status">Checking session</p>;
  }

  if (status === "signed_in" && hasSession) {
    return <p className="session-status session-ready">Signed in</p>;
  }

  return <p className="session-status">Signed out</p>;
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
  state,
  configReady,
}: {
  state: SubmitState;
  configReady: boolean;
}) {
  if (!configReady) {
    return (
      <p className="status-message status-warning" role="status">
        Runtime configuration is incomplete. Review the missing env names above
        before submitting.
      </p>
    );
  }

  if (state.status === "loading") {
    return (
      <p className="status-message" role="status">
        Saving expense...
      </p>
    );
  }

  if (state.status === "success") {
    return (
      <p className="status-message status-success" role="status">
        Expense saved for {state.activityDate}: TWD {state.amount} -{" "}
        {state.description}. Ready for next expense.
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
      Ready for one expense record.
    </p>
  );
}

function FinanceReviewPanel({
  canLoad,
  endDate,
  movementFilter,
  onEndDateChange,
  onMovementFilterChange,
  onRefresh,
  onStartDateChange,
  reviewState,
  startDate,
}: {
  canLoad: boolean;
  endDate: string;
  movementFilter: MovementFilter;
  onEndDateChange: (value: string) => void;
  onMovementFilterChange: (value: MovementFilter) => void;
  onRefresh: () => void;
  onStartDateChange: (value: string) => void;
  reviewState: ReviewState;
  startDate: string;
}) {
  const isLoading = reviewState.status === "loading";

  return (
    <section className="review-panel" aria-labelledby="review-title">
      <div className="page-heading review-heading">
        <p className="eyebrow">Staging read-only review</p>
        <h2 id="review-title">Finance review</h2>
        <p className="summary">
          Inspect active RLS-owned staging records with direct browser reads
          only.
        </p>
      </div>

      <div className="review-filters" aria-label="Review filters">
        <label className="field compact-field">
          <span>Start date</span>
          <input
            onChange={(event) => onStartDateChange(event.target.value)}
            type="date"
            value={startDate}
          />
        </label>

        <label className="field compact-field">
          <span>End date</span>
          <input
            onChange={(event) => onEndDateChange(event.target.value)}
            type="date"
            value={endDate}
          />
        </label>

        <label className="field compact-field">
          <span>Movement type</span>
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
          {isLoading ? "Loading..." : "Refresh review"}
        </button>
      </div>

      {!canLoad ? (
        <p className="status-message status-muted" role="status">
          Sign in with complete runtime configuration to load read-only review
          data.
        </p>
      ) : null}

      {reviewState.status === "loading" ? (
        <p className="status-message" role="status">
          Loading read-only review data...
        </p>
      ) : null}

      {reviewState.status === "failure" ? (
        <p className="status-message status-error" role="alert">
          {reviewState.message}
        </p>
      ) : null}

      {reviewState.status === "success" ? (
        <ReviewContent data={reviewState.data} />
      ) : null}
    </section>
  );
}

function ReviewContent({ data }: { data: ReviewData }) {
  return (
    <div className="review-content">
      <section className="review-section" aria-labelledby="range-total-title">
        <h3 id="range-total-title">Totals for selected range</h3>
        <TotalList emptyLabel="No activity in range." totals={data.dateRangeTotals} />
      </section>

      <div className="totals-grid">
        <section className="review-section" aria-labelledby="movement-total-title">
          <h3 id="movement-total-title">By movement type</h3>
          <TotalList emptyLabel="No movement totals." totals={data.movementTotals} />
        </section>

        <section className="review-section" aria-labelledby="category-total-title">
          <h3 id="category-total-title">By category</h3>
          <TotalList emptyLabel="No category totals." totals={data.categoryTotals} />
        </section>

        <section className="review-section" aria-labelledby="account-total-title">
          <h3 id="account-total-title">By account</h3>
          <TotalList emptyLabel="No account totals." totals={data.accountTotals} />
        </section>
      </div>

      <section className="review-section" aria-labelledby="recent-activity-title">
        <div className="section-heading">
          <h3 id="recent-activity-title">Recent active owned activities</h3>
          <p className="session-status session-ready">
            {data.activities.length} shown
          </p>
        </div>

        {data.activities.length > 0 ? (
          <ul className="activity-list">
            {data.activities.map((activity, index) => (
              <li
                className="activity-item"
                key={`${activity.activityDate}-${activity.createdAt ?? index}`}
              >
                <div className="activity-main">
                  <span>{activity.activityDate}</span>
                  <strong>
                    {formatAmount(activity.amount, activity.currency)}
                  </strong>
                </div>
                <div className="activity-meta">
                  <span>{activity.movementType}</span>
                  <span>{activity.accountName}</span>
                  <span>{activity.categoryName}</span>
                </div>
                <p>{activity.description}</p>
                <small>Created {formatOptionalTimestamp(activity.createdAt)}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            No active owned activities match the filters.
          </p>
        )}
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
