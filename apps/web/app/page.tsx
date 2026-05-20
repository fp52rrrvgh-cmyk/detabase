"use client";

import { createClient } from "@supabase/supabase-js";
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

type RuntimeConfig = {
  supabaseUrl: string;
  publishableKey: string;
  functionUrl: string;
  accountId: string;
  categoryId: string;
};

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
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });

  const configReady = hasRuntimeConfig(runtimeConfig);
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
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      setSubmitState({
        status: "failure",
        message: "Authenticated session is unavailable.",
      });
      return;
    }

    const response = await fetch(runtimeConfig.functionUrl, {
      method: "POST",
      headers: {
        apikey: runtimeConfig.publishableKey,
        authorization: `Bearer ${session.access_token}`,
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

    const responseBody = await readSafeJson(response);
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
        message: code
          ? `Expense was not saved. Safe error: ${code}.`
          : "Expense was not saved. Inspect staging separately if needed.",
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

        <form className="entry-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Amount</span>
            <input
              inputMode="decimal"
              min="0.01"
              name="amount"
              onChange={(event) => setAmount(event.target.value)}
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
              onChange={(event) => setDescription(event.target.value)}
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
            disabled={submitState.status === "loading"}
            type="submit"
          >
            {submitState.status === "loading" ? "Saving..." : "Save expense"}
          </button>
        </form>

        <StatusMessage state={submitState} configReady={configReady} />
      </section>
    </main>
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
        Runtime configuration is incomplete. Add the approved public env names
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
        {state.description}
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
