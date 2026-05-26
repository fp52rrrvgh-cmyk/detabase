"use client";

export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatAmount,
} from "../lib/format";
import {
  runtimeConfig,
  CORE_RUNTIME_KEYS,
} from "../constants";
import {
  hasRuntimeFields,
} from "../lib/runtime";

// --- Types ---

type BudgetRow = {
  id: string;
  category_id: string;
  budget_year: number;
  budget_month: number;
  limit_amount: number;
};

type CategoryRow = {
  id: string;
  display_name: string;
  grouping_purpose: string | null;
};

type AlertRow = {
  budget_id: string;
  category_id: string;
  category_name: string;
  budget_year: number;
  budget_month: number;
  limit_amount: number;
  spent_amount: number;
  alert_level: "ok" | "warning" | "exceeded";
};

// --- Helpers ---

function getYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function yearMonthLabel(year: number, month: number): string {
  return `${year} 年 ${month} 月`;
}

function alertLevelLabel(level: string): string {
  switch (level) {
    case "exceeded": return "超支";
    case "warning": return "將近上限";
    default: return "正常";
  }
}

function alertLevelClass(level: string): string {
  switch (level) {
    case "exceeded": return "alert-exceeded";
    case "warning": return "alert-warning";
    default: return "alert-ok";
  }
}

// --- Component ---

export default function BudgetsPage() {
  const supabase = useMemo(() => {
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.publishableKey) return null;
    return createClient(runtimeConfig.supabaseUrl, runtimeConfig.publishableKey);
  }, []);

  const coreConfigReady = hasRuntimeFields(runtimeConfig, CORE_RUNTIME_KEYS);

  const { year: initialYear, month: initialMonth } = getYearMonth();
  const [budgetYear, setBudgetYear] = useState(initialYear);
  const [budgetMonth, setBudgetMonth] = useState(initialMonth);

  const [alertRows, setAlertRows] = useState<AlertRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable budget amounts keyed by "category_id:year:month"
  const [editingAmounts, setEditingAmounts] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  // --- Load data ---
  const loadData = useCallback(async () => {
    if (!supabase || !coreConfigReady) return;

    setLoading(true);
    setError(null);

    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error || !sessionResult.data.session) {
      setError("請先登入");
      setLoading(false);
      return;
    }

    const functionUrl = runtimeConfig.functionUrl.replace(/\/functions\/v1\/.*$/, "/functions/v1/");

    const [categoriesResult, budgetsResult, alertsResult] = await Promise.all([
      supabase
        .from("finance_categories")
        .select("id,display_name,grouping_purpose")
        .eq("is_active", true)
        .order("display_name", { ascending: true })
        .limit(500),
      supabase
        .from("finance_budgets")
        .select("id,category_id,budget_year,budget_month,limit_amount")
        .eq("budget_year", budgetYear)
        .eq("budget_month", budgetMonth)
        .limit(500),
      supabase
        .from("finance_budget_alerts")
        .select("*")
        .eq("budget_year", budgetYear)
        .eq("budget_month", budgetMonth),
    ]);

    if (categoriesResult.error || budgetsResult.error || alertsResult.error) {
      const parts: string[] = [];
      if (categoriesResult.error) parts.push(`分類:${categoriesResult.error.message}`);
      if (budgetsResult.error) parts.push(`預算:${budgetsResult.error.message}`);
      if (alertsResult.error) parts.push(`警示:${alertsResult.error.message}`);
      setError(`讀取資料時發生錯誤 (${parts.join(", ")})`);
      setLoading(false);
      return;
    }

    setCategories((categoriesResult.data ?? []) as CategoryRow[]);
    setBudgets((budgetsResult.data ?? []) as BudgetRow[]);
    setAlertRows((alertsResult.data ?? []) as AlertRow[]);

    // Initialise editing amounts from current budgets
    const amounts: Record<string, string> = {};
    for (const b of (budgetsResult.data ?? []) as BudgetRow[]) {
      amounts[`${b.category_id}:${b.budget_year}:${b.budget_month}`] = String(b.limit_amount);
    }
    setEditingAmounts(amounts);

    setLoading(false);
  }, [supabase, coreConfigReady, budgetYear, budgetMonth]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // --- Set budget ---
  const [setBudgetMessage, setSetBudgetMessage] = useState<string | null>(null);
  const [setBudgetError, setSetBudgetError] = useState<string | null>(null);

  async function handleSetBudget(categoryId: string) {
    const key = `${categoryId}:${budgetYear}:${budgetMonth}`;
    const rawAmount = editingAmounts[key]?.trim();
    if (!rawAmount || !/^\d+$/.test(rawAmount)) return;

    const amount = parseInt(rawAmount, 10);
    if (amount <= 0) return;

    if (!supabase) return;
    const sessionResult = await supabase.auth.getSession();
    if (sessionResult.error || !sessionResult.data.session?.access_token) return;

    setSavingKeys((prev) => new Set(prev).add(key));
    setSetBudgetMessage(null);
    setSetBudgetError(null);

    try {
      // Use Supabase REST API upsert directly (avoids Edge Function CORS complexity)
      const response = await fetch(
        `${runtimeConfig.supabaseUrl}/rest/v1/finance_budgets`,
        {
          method: "POST",
          headers: {
            apikey: runtimeConfig.publishableKey,
            authorization: `Bearer ${sessionResult.data.session.access_token}`,
            "content-type": "application/json",
            prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify({
            user_id: sessionResult.data.session.user.id,
            category_id: categoryId,
            budget_year: budgetYear,
            budget_month: budgetMonth,
            limit_amount: amount,
          }),
        },
      );

      if (response.ok) {
        setSetBudgetMessage("預算已設定成功");
        await loadData();
      } else {
        let errorMsg = `HTTP ${response.status}: `;
        try {
          const body = await response.json();
          errorMsg += JSON.stringify(body);
          if (body?.error?.message) errorMsg = body.error.message;
        } catch {
          const raw = await response.text().catch(() => "(cannot read body)");
          errorMsg += raw;
        }
        setSetBudgetError(errorMsg);
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      setSetBudgetError(`網路請求失敗: ${errMsg}`);
    } finally {
      setSavingKeys((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }

  // --- Delete budget ---
  async function handleDeleteBudget(budgetId: string) {
    if (!supabase) return;
    await supabase.from("finance_budgets").delete().eq("id", budgetId);
    await loadData();
  }

  // --- Build budget map ---
  const budgetMap = useMemo(() => {
    const map: Record<string, BudgetRow> = {};
    for (const b of budgets) {
      map[`${b.category_id}:${b.budget_year}:${b.budget_month}`] = b;
    }
    return map;
  }, [budgets]);

  const alertMap = useMemo(() => {
    const map: Record<string, AlertRow> = {};
    for (const a of alertRows) {
      map[a.category_id] = a;
    }
    return map;
  }, [alertRows]);

  // Month navigation
  function prevMonth() {
    if (budgetMonth === 1) {
      setBudgetYear((y) => y - 1);
      setBudgetMonth(12);
    } else {
      setBudgetMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (budgetMonth === 12) {
      setBudgetYear((y) => y + 1);
      setBudgetMonth(1);
    } else {
      setBudgetMonth((m) => m + 1);
    }
  }

  if (!coreConfigReady) {
    return (
      <main className="app-shell">
        <section className="entry-panel">
          <h1>預算管理</h1>
          <p>執行環境設定不完整，請先完成設定。</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="entry-panel">
        <div className="page-heading">
          <h1>預算管理</h1>
          <p className="summary">
            設定每月各分類支出上限，掌握超支風險。
          </p>
        </div>

        {/* Month selector */}
        <div className="month-nav">
          <button className="secondary-button" onClick={prevMonth} type="button">
            ← 上月
          </button>
          <span className="month-label">{yearMonthLabel(budgetYear, budgetMonth)}</span>
          <button className="secondary-button" onClick={nextMonth} type="button">
            下月 →
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        {setBudgetMessage && <p className="success-message">{setBudgetMessage}</p>}
        {setBudgetError && <p className="error-message">{setBudgetError}</p>}

        {loading ? (
          <p>載入中...</p>
        ) : (
          <div className="budget-list">
            {/* Categories that already have budgets (sorted by alert level) */}
            {alertRows.length > 0 && (
              <>
                <h2 className="budget-section-title">已設定預算</h2>
                {alertRows.map((alert) => (
                  <div
                    key={alert.budget_id}
                    className={`budget-card ${alertLevelClass(alert.alert_level)}`}
                  >
                    <div className="budget-card-header">
                      <span className="budget-category-name">{alert.category_name}</span>
                      <span className={`budget-alert-badge ${alertLevelClass(alert.alert_level)}`}>
                        {alertLevelLabel(alert.alert_level)}
                      </span>
                    </div>
                    <div className="budget-card-body">
                      <div className="budget-progress-bar">
                        <div
                          className={`budget-progress-fill ${alertLevelClass(alert.alert_level)}`}
                          style={{
                            width: `${Math.min(100, Math.round((alert.spent_amount / alert.limit_amount) * 100))}%`,
                          }}
                        />
                      </div>
                      <div className="budget-card-stats">
                        <span>已花費：{formatAmount(alert.spent_amount, "TWD")}</span>
                        <span>上限：{formatAmount(alert.limit_amount, "TWD")}</span>
                      </div>
                    </div>
                    <div className="budget-card-actions">
                      <label className="field budget-amount-field">
                        <span>修改上限</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={editingAmounts[`${alert.category_id}:${budgetYear}:${budgetMonth}`] ?? alert.limit_amount}
                          onChange={(e) =>
                            setEditingAmounts((prev) => ({
                              ...prev,
                              [`${alert.category_id}:${budgetYear}:${budgetMonth}`]: e.target.value,
                            }))
                          }
                        />
                      </label>
                      <button
                        className="submit-button budget-action-btn"
                        disabled={savingKeys.has(`${alert.category_id}:${budgetYear}:${budgetMonth}`)}
                        onClick={() => handleSetBudget(alert.category_id)}
                        type="button"
                      >
                        {savingKeys.has(`${alert.category_id}:${budgetYear}:${budgetMonth}`) ? "儲存中..." : "更新"}
                      </button>
                      <button
                        className="secondary-button budget-action-btn"
                        onClick={() => handleDeleteBudget(alert.budget_id)}
                        type="button"
                      >
                        清除
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Categories without budgets (expense grouping) */}
            <h2 className="budget-section-title">
              {alertRows.length > 0 ? "未設定預算" : "所有支出分類"}
            </h2>
            {categories
              .filter((c) => c.grouping_purpose === "expense" || c.grouping_purpose === null)
              .filter((c) => !alertMap[c.id])
              .map((category) => {
                const key = `${category.id}:${budgetYear}:${budgetMonth}`;
                const existing = budgetMap[key];
                const amount = editingAmounts[key] ?? "";

                return (
                  <div key={category.id} className="budget-card budget-card-inactive">
                    <div className="budget-card-header">
                      <span className="budget-category-name">{category.display_name}</span>
                      <span className="budget-alert-badge alert-ok">未設定</span>
                    </div>
                    <div className="budget-card-actions">
                      <label className="field budget-amount-field">
                        <span>設定上限</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={amount}
                          onChange={(e) =>
                            setEditingAmounts((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          placeholder="輸入預算金額"
                        />
                      </label>
                      <button
                        className="submit-button budget-action-btn"
                        disabled={!amount || savingKeys.has(key)}
                        onClick={() => handleSetBudget(category.id)}
                        type="button"
                      >
                        {savingKeys.has(key) ? "儲存中..." : "設定"}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </section>
    </main>
  );
}
