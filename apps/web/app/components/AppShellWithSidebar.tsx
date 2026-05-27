"use client";

import { useState, type ReactNode, useCallback, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Sidebar } from "./Sidebar";
import { runtimeConfig, CORE_RUNTIME_KEYS } from "../constants";
import { hasRuntimeFields } from "../lib/runtime";

export function AppShellWithSidebar({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Auth state
  const coreConfigReady = hasRuntimeFields(runtimeConfig, CORE_RUNTIME_KEYS);
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const [session, setSession] = useState<any>(null);
  const [authStatus, setAuthStatus] = useState<"checking" | "signed_in" | "signed_out">("checking");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) { setAuthStatus("signed_out"); return; }
    supabase.auth.getSession().then(({ data }: any) => {
      setSession(data.session);
      setAuthStatus(data.session ? "signed_in" : "signed_out");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, nextSession: any) => {
      setSession(nextSession);
      setAuthStatus(nextSession ? "signed_in" : "signed_out");
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignIn = useCallback(async () => {
    if (!supabase || !email || !password) return;
    setAuthLoading(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    setEmail("");
    setPassword("");
    setProfileOpen(false);
  }, [supabase, email, password]);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setAuthStatus("signed_out");
    setProfileOpen(false);
  }, [supabase]);

  const userInitial = session?.user?.email?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <div className="app-shell-with-sidebar">
      {/* Top bar — hamburger + profile */}
      <div className="topbar">
        <button
          className="sb-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="開啟選單"
          type="button"
        >
          <span className="sb-hamburger-line" />
          <span className="sb-hamburger-line" />
          <span className="sb-hamburger-line" />
        </button>

        <div className="topbar-right">
          {/* Profile avatar */}
          <button
            className="profile-avatar"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="帳號選單"
            type="button"
          >
            {authStatus === "signed_in" ? (
              <span className="profile-avatar-initial">{userInitial}</span>
            ) : (
              <span className="profile-avatar-icon">👤</span>
            )}
          </button>

          {/* Profile dropdown */}
          {profileOpen && (
            <>
              <div className="profile-overlay" onClick={() => setProfileOpen(false)} />
              <div className="profile-dropdown">
                {authStatus === "signed_in" ? (
                  <>
                    <div className="profile-dropdown-header">
                      <span className="profile-dropdown-email">{session?.user?.email ?? "已登入"}</span>
                      <span className="profile-dropdown-badge">已登入</span>
                    </div>
                    <button className="profile-dropdown-item" onClick={handleSignOut} type="button">
                      🚪 登出
                    </button>
                  </>
                ) : (
                  <>
                    <div className="profile-dropdown-header">
                      <span className="profile-dropdown-title">登入帳號</span>
                    </div>
                    {authError && <p className="profile-dropdown-error">{authError}</p>}
                    <input
                      className="d-input"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                      className="d-input"
                      type="password"
                      placeholder="密碼"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      className="d-btn d-btn-primary"
                      disabled={authLoading || !email || !password}
                      onClick={handleSignIn}
                      type="button"
                    >
                      {authLoading ? "登入中..." : "登入"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-main-content">{children}</main>
    </div>
  );
}
