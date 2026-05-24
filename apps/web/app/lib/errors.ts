import type { QuickCaptureMode } from "../types";
import { quickCaptureModeLabel } from "./format";

export function extractSafeErrorCode(body: unknown): string | null {
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

export function safeFailureMessage(
  code: string | null,
  mode: QuickCaptureMode,
): string {
  const label = quickCaptureModeLabel(mode);

  switch (code) {
    case "invalid_account_reference":
      return `${label}未儲存：請確認預設${label}帳戶設定為同一位 Staging 使用者的有效帳戶。`;
    case "invalid_category_reference":
      return `${label}未儲存：請確認預設${label}分類設定為同一位 Staging 使用者的有效${label}分類。`;
    case "category_movement_mismatch":
      return `${label}未儲存：請確認預設${label}分類與${label}類型一致。`;
    default:
      return code
        ? `${label}未儲存，安全錯誤代碼：${code}。`
        : `${label}未儲存，請稍後重試。`;
  }
}

export function safeVoidFailureMessage(code: string | null): string {
  switch (code) {
    case "invalid_reason":
      return "請輸入作廢原因。";
    case "invalid_activity_reference":
      return "無法作廢這筆活動，請重新整理檢視後再試。";
    case "activity_not_found":
      return "找不到可作廢的支出活動，可能已不存在或不屬於目前登入者。";
    case "activity_not_expense":
      return "目前只支援作廢支出活動。";
    case "activity_already_voided":
      return "這筆支出已作廢，請重新整理檢視。";
    case "void_not_allowed":
      return "目前無法作廢這筆支出，請確認已登入 Staging 後再試。";
    case "void_insert_failed":
      return "作廢請求未完成，請稍後再試。";
    case "invalid_request":
      return "作廢請求格式不正確，請重新整理檢視後再試。";
    default:
      return "作廢請求未完成，請稍後再試。";
  }
}

export function deriveVoidFunctionUrl(functionUrl: string): string | null {
  const trimmedUrl = functionUrl.trim();
  if (!trimmedUrl) {
    return null;
  }

  try {
    const url = new URL(trimmedUrl);
    const marker = "/functions/v1/";
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    url.pathname = `${url.pathname.slice(
      0,
      markerIndex + marker.length,
    )}void-finance-activity`;
    url.search = "";
    url.hash = "";

    return url.toString();
  } catch {
    return null;
  }
}
