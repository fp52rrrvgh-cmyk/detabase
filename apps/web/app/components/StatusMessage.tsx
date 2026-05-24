import type { QuickCaptureMode, SubmitState } from "../types";
import { quickCaptureModeLabel } from "../lib/format";

export function StatusMessage({
  coreConfigReady,
  mode,
  modeConfigReady,
  state,
}: {
  coreConfigReady: boolean;
  mode: QuickCaptureMode;
  modeConfigReady: boolean;
  state: SubmitState;
}) {
  const label = quickCaptureModeLabel(mode);

  if (!coreConfigReady) {
    return (
      <p className="status-message status-warning" role="status">
        執行環境設定不完整，送出前先補齊缺少的環境設定名稱。
      </p>
    );
  }

  if (!modeConfigReady) {
    return (
      <p className="status-message status-warning" role="status">
        {label}設定不完整，送出前先補齊缺少的 {label} runtime env names。
      </p>
    );
  }

  if (state.status === "loading") {
    return (
      <p className="status-message" role="status">
        儲存{label}中...
      </p>
    );
  }

  if (state.status === "success") {
    const savedLabel = quickCaptureModeLabel(state.movementType);

    return (
      <p className="status-message status-success" role="status">
        已儲存{savedLabel}：{state.activityDate}，TWD {state.amount}，
        {state.description}。
        可直接輸入下一筆。
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
      可直接輸入一筆{label}。
    </p>
  );
}
