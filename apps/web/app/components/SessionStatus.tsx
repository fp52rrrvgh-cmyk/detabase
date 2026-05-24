import type { AuthStatus } from "../types";

export function SessionStatus({
  status,
  hasSession,
}: {
  status: AuthStatus;
  hasSession: boolean;
}) {
  if (status === "checking") {
    return <p className="session-status">檢查中</p>;
  }

  if (status === "signed_in" && hasSession) {
    return <p className="session-status session-ready">已登入</p>;
  }

  return <p className="session-status">已登出</p>;
}
