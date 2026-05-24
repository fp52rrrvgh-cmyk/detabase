import type { AuthMessage } from "../types";

export function AuthMessageView({ message }: { message: AuthMessage | null }) {
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
