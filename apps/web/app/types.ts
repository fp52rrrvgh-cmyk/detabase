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
  supabaseFunctionsUrl: string;
  expenseAccountId: string;
  expenseCategoryId: string;
  incomeAccountId: string;
  incomeCategoryId: string;
};

export type RuntimeStatusItem = {
  name: string;
  configured: boolean;
};

export type QuickCaptureMode = "expense" | "income";
