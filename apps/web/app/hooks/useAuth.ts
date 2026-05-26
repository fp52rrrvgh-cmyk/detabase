import type { Session } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { AuthMessage, AuthStatus, SubmitState } from "../types";

import { createClient } from "@supabase/supabase-js";

import { runtimeConfig, CORE_RUNTIME_KEYS } from "../constants";
import { hasRuntimeFields } from "../lib/runtime";

export type UseAuthReturn = {
  supabase: any | null;
  coreConfigReady: boolean;
  email: string;
  password: string;
  session: Session | null;
  authStatus: AuthStatus;
  authMessage: AuthMessage | null;
  authLoading: boolean;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  handleSignIn: (event: FormEvent<HTMLFormElement>) => void;
  handleSignOut: () => void;
};

export function useAuth(
  onSignOutCleanup: () => void,
): UseAuthReturn {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [authMessage, setAuthMessage] = useState<AuthMessage | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const coreConfigReady = hasRuntimeFields(runtimeConfig, CORE_RUNTIME_KEYS);

  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) {
      return null;
    }
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
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
        if (!isMounted) return;
        setSession(data.session);
        setAuthStatus(data.session ? "signed_in" : "signed_out");
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setAuthStatus("signed_out");
        setAuthMessage({
          status: "failure",
          message: "無法安全確認 Session 狀態。",
        });
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthStatus(nextSession ? "signed_in" : "signed_out");
      if (nextSession) setAuthMessage(null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignIn = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAuthMessage(null);

      const trimmedEmail = email.trim();
      if (!coreConfigReady || !supabase) {
        setAuthMessage({
          status: "failure",
          message: "執行環境設定不完整，先補齊設定後再試。",
        });
        return;
      }

      if (!trimmedEmail || !password) {
        setAuthMessage({
          status: "failure",
          message: "請輸入 Staging 帳號與密碼。",
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
          message: "登入失敗，請檢查 Staging 帳號與密碼。",
        });
        return;
      }

      setPassword("");
      setSession(data.session);
      setAuthStatus("signed_in");
      setAuthMessage({ status: "success", message: "已完成 Staging 登入。" });
    },
    [coreConfigReady, email, password, supabase],
  );

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;

    setAuthLoading(true);
    const { error } = await supabase.auth.signOut();
    setAuthLoading(false);

    if (error) {
      setAuthMessage({
        status: "failure",
        message: "登出失敗，請稍後再試。",
      });
      return;
    }

    setSession(null);
    setAuthStatus("signed_out");
    setAuthMessage({ status: "success", message: "已登出。" });
    onSignOutCleanup();
  }, [onSignOutCleanup, supabase]);

  return {
    supabase,
    coreConfigReady,
    email,
    password,
    session,
    authStatus,
    authMessage,
    authLoading,
    setEmail,
    setPassword,
    handleSignIn,
    handleSignOut,
  };
}
