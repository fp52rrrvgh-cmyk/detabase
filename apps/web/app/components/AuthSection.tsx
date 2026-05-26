"use client";

import type { FormEvent } from "react";

import type { AuthMessage, AuthStatus } from "../types";

import { AuthMessageView } from "./AuthMessageView";
import { SessionStatus } from "./SessionStatus";

export type AuthSectionProps = {
  authLoading: boolean;
  authMessage: AuthMessage | null;
  authStatus: AuthStatus;
  coreConfigReady: boolean;
  email: string;
  hasSession: boolean;
  password: string;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignIn: (event: FormEvent<HTMLFormElement>) => void;
  onSignOut: () => void;
};

export function AuthSection({
  authLoading,
  authMessage,
  authStatus,
  coreConfigReady,
  email,
  hasSession,
  password,
  onEmailChange,
  onPasswordChange,
  onSignIn,
  onSignOut,
}: AuthSectionProps) {
  return (
    <section className="auth-section" aria-labelledby="auth-title">
      <div className="section-heading">
        <h2 id="auth-title">Staging 登入</h2>
        <SessionStatus status={authStatus} hasSession={hasSession} />
      </div>

      {authStatus === "signed_in" ? (
        <button
          className="secondary-button"
          disabled={authLoading}
          onClick={onSignOut}
          type="button"
        >
          {authLoading ? "登出中..." : "登出"}
        </button>
      ) : (
        <form className="auth-form" onSubmit={onSignIn}>
          <label className="field">
            <span>電子郵件</span>
            <input
              autoComplete="email"
              inputMode="email"
              name="email"
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="staging 操作員信箱"
              required
              type="email"
              value={email}
            />
          </label>

          <label className="field">
            <span>密碼</span>
            <input
              autoComplete="current-password"
              name="password"
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="staging 密碼"
              required
              type="password"
              value={password}
            />
          </label>

          <button
            className="submit-button"
            disabled={authLoading || !coreConfigReady}
            type="submit"
          >
            {authLoading ? "登入中..." : "登入"}
          </button>
        </form>
      )}

      <AuthMessageView message={authMessage} />
    </section>
  );
}
