import type { QuickCaptureMode } from "../types";

export function normalizeAmount(value: string | number): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export function safeReferenceLabel(
  references: Map<string, string>,
  id: string | null,
  fallback: string,
): string {
  if (!id) {
    return fallback;
  }

  return references.get(id) ?? fallback;
}

export function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })}`;
}

export function formatOptionalTimestamp(value: string | null): string {
  if (!value) {
    return "未顯示";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "未顯示";
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function isPositiveIntegerAmount(value: string): boolean {
  const trimmed = value.trim();
  if (!/^[1-9]\d*$/.test(trimmed)) {
    return false;
  }

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0;
}

export function quickCaptureModeLabel(mode: QuickCaptureMode): string {
  return mode === "income" ? "收入" : "支出";
}
