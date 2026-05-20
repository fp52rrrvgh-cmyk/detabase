"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

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

function hasRuntimeConfig(config: RuntimeConfig): boolean {
  return Object.values(config).every((value) => value.trim().length > 0);
}

function runtimeEnvironmentStatus(config: RuntimeConfig): RuntimeStatusItem[] {
  return RUNTIME_ENVIRONMENT_FIELDS.map(({ name, key }) => ({
    name,
    configured: config[key].trim().length > 0,
  }));
}

function isPositiveAmount(value: string): boolean {
  const trimmed = value.trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) {
    return false;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0;
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

    if (!isPositiveAmount(trimmedAmount)) {
      setSubmitState({
        status: "failure",
        message: "Enter a positive amount before submitting.",
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
  }

  return (
    <main className="app-shell" aria-labelledby="page-title">
      <section className="entry-panel">
        <div className="page-heading">
          <p className="eyebrow">Staging expense entry</p>
          <h1 id="page-title">Finance expense entry</h1>
          <p className="summary">
            Record one TWD expense through the staging ingestion endpoint.
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
              inputMode="decimal"
              min="0.01"
              name="amount"
              onChange={(event) => handleAmountChange(event.target.value)}
              placeholder="0"
              required
              step="0.01"
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
