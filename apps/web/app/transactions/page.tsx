"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../hooks/useAuth";

/* ───────── Types ───────── */

type Category = {
  id: string;
  display_name: string;
  grouping_purpose: string | null;
};

type Account = {
  id: string;
  display_name: string;
  account_type: string;
};

type Filters = {
  keyword: string;
  dateFrom: string;
  dateTo: string;
  movementType: "" | "income" | "expense";
  amountMin: string;
  amountMax: string;
  categoryId: string;
  accountId: string;
};

type SortField = "activity_date" | "amount";
type SortDir = "asc" | "desc";

type TxRow = {
  id: string;
  activity_date: string;
  description: string | null;
  amount: number;
  movement_type: string;
  category_id: string | null;
  account_id: string | null;
  finance_categories: { display_name: string }[] | null;
  finance_accounts: { display_name: string }[] | null;
};

type ListState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      rows: TxRow[];
      totalCount: number;
      hasMore: boolean;
    }
  | { status: "failure"; message: string };

/* ───────── Constants ───────── */

const PAGE_SIZE = 20;
const DEFAULT_FILTERS: Filters = {
  keyword: "",
  dateFrom: "",
  dateTo: "",
  movementType: "",
  amountMin: "",
  amountMax: "",
  categoryId: "",
  accountId: "",
};

/* ───────── Helpers ───────── */

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatTWD(n: number): string {
  return `${Math.abs(n).toLocaleString()}`;
}

/* ───────── Sort Controls ───────── */

function SortControls({
  sortField,
  sortDir,
  onSortChange,
}: {
  sortField: SortField;
  sortDir: SortDir;
  onSortChange: (field: SortField, dir: SortDir) => void;
}) {
  return (
    <div className="txs-sort-controls">
      <span className="txs-sort-label">排序：</span>
      <select
        className="txs-select txs-select-sm"
        value={sortField}
        onChange={(e) =>
          onSortChange(e.target.value as SortField, sortDir)
        }
      >
        <option value="activity_date">日期</option>
        <option value="amount">金額</option>
      </select>
      <select
        className="txs-select txs-select-sm"
        value={sortDir}
        onChange={(e) =>
          onSortChange(sortField, e.target.value as SortDir)
        }
      >
        <option value="desc">最新／最大</option>
        <option value="asc">最舊／最小</option>
      </select>
    </div>
  );
}

/* ───────── Inline Edit Form ───────── */

function InlineEditForm({
  tx,
  categories,
  accounts,
  onSave,
  onCancel,
}: {
  tx: TxRow;
  categories: Category[];
  accounts: Account[];
  onSave: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const isIncome = tx.movement_type === "income";
  const [description, setDescription] = useState(tx.description ?? "");
  const [amount, setAmount] = useState(String(tx.amount));
  const [categoryId, setCategoryId] = useState(tx.category_id ?? "");
  const [accountId, setAccountId] = useState(tx.account_id ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!description.trim()) return;
    const parsed = parseFloat(amount);
    if (Number.isNaN(parsed) || parsed <= 0) return;

    setSaving(true);
    try {
      const updates: Record<string, unknown> = {
        description: description.trim(),
        amount: parsed,
        category_id: categoryId || null,
        account_id: accountId || null,
      };
      await onSave(tx.id, updates);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="txs-edit-inline"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="txs-edit-grid">
        <div className="txs-field">
          <label className="txs-label">描述</label>
          <input
            className="txs-input"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="txs-field">
          <label className="txs-label">金額</label>
          <input
            className="txs-input"
            type="number"
            min="0"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="txs-field">
          <label className="txs-label">分類</label>
          <select
            className="txs-input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">未分類</option>
            {categories
              .filter((c) =>
                !c.grouping_purpose || c.grouping_purpose === tx.movement_type || c.grouping_purpose === "both"
              )
              .map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.display_name}
                </option>
              ))}
          </select>
        </div>
        <div className="txs-field">
          <label className="txs-label">帳戶</label>
          <select
            className="txs-input"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            <option value="">未指定</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.display_name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="txs-btn-row" style={{ marginTop: "8px" }}>
        <button
          className="txs-btn txs-btn-primary"
          onClick={handleSave}
          disabled={saving}
          type="button"
        >
          {saving ? "儲存中…" : "💾 儲存"}
        </button>
        <button
          className="txs-btn txs-btn-secondary"
          onClick={onCancel}
          type="button"
        >
          ✕ 取消
        </button>
      </div>
    </div>
  );
}

/* ───────── Transaction Row ───────── */

function TxItem({
  tx,
  categories,
  accounts,
  supabase,
  onUpdated,
}: {
  tx: TxRow;
  categories: Category[];
  accounts: Account[];
  supabase: any;
  onUpdated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const isIncome = tx.movement_type === "income";
  const catLabel = tx.finance_categories?.[0]?.display_name ?? "未分類";
  const acctLabel = tx.finance_accounts?.[0]?.display_name ?? "未知";
  const desc = tx.description?.trim() || "無備註";

  const handleSave = async (id: string, updates: Record<string, unknown>) => {
    setEditLoading(true);
    try {
      const { error } = await supabase
        .from("finance_activities")
        .update(updates)
        .eq("id", id);

      if (error) {
        console.error("Update failed:", error);
        return;
      }
      onUpdated();
      setExpanded(false);
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <>
      <div
        className={`d-tx-item ${expanded ? "d-tx-item-active" : ""}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="d-tx-left">
          <span
            className={`d-tx-icon ${isIncome ? "icon-income" : "icon-expense"}`}
          >
            {isIncome ? "↓" : "↑"}
          </span>
          <div>
            <div className="d-tx-desc">{desc}</div>
            <div className="d-tx-cat">
              {catLabel} · {acctLabel} · {tx.activity_date}
            </div>
          </div>
        </div>
        <div className={`d-tx-amt ${isIncome ? "income" : "danger"}`}>
          {isIncome ? "+" : "-"}TWD {formatTWD(tx.amount)}
        </div>
      </div>
      {expanded && (
        <InlineEditForm
          tx={tx}
          categories={categories}
          accounts={accounts}
          onSave={handleSave}
          onCancel={() => setExpanded(false)}
        />
      )}
    </>
  );
}

/* ───────── Main Page ───────── */

export default function TransactionsPage() {
  const auth = useAuth(() => {});
  const supabase = auth.supabase;

  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [state, setState] = useState<ListState>({ status: "idle" });
  const [sortField, setSortField] = useState<SortField>("activity_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchLoading, setSearchLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const pageRef = useRef(0);
  const loadedRef = useRef(false);
  const currentFiltersRef = useRef<Filters>({ ...DEFAULT_FILTERS });
  const currentSortRef = useRef<{ field: SortField; dir: SortDir }>({
    field: "activity_date",
    dir: "desc",
  });

  /* ───────── Load reference data ───────── */
  useEffect(() => {
    if (!supabase || auth.authStatus !== "signed_in") return;
    let cancelled = false;

    Promise.all([
      supabase
        .from("finance_categories")
        .select("id,display_name,grouping_purpose")
        .eq("is_active", true)
        .limit(500),
      supabase
        .from("finance_accounts")
        .select("id,display_name,account_type")
        .eq("is_active", true)
        .limit(50),
    ]).then(([catResult, acctResult]) => {
      if (cancelled) return;
      setCategories((catResult.data ?? []) as Category[]);
      setAccounts((acctResult.data ?? []) as Account[]);
    });

    return () => {
      cancelled = true;
    };
  }, [supabase, auth.authStatus]);

  /* ───────── Search function ───────── */
  const doSearch = useCallback(
    async (append: boolean) => {
      if (!supabase) {
        setState({ status: "failure", message: "Runtime 設定不完整" });
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ status: "failure", message: "請先登入" });
        return;
      }

      const page = append ? pageRef.current + 1 : 0;
      pageRef.current = page;

      const f = currentFiltersRef.current;
      const s = currentSortRef.current;

      setState({ status: "loading" });
      setSearchLoading(true);

      try {
        let query = supabase
          .from("finance_activities")
          .select(
            "id,activity_date,description,amount,movement_type,category_id,account_id,finance_categories(display_name),finance_accounts(display_name)",
            { count: "exact" },
          )
          .order(s.field, { ascending: s.dir === "asc" });

        // Keyword
        if (f.keyword.trim()) {
          query = query.ilike("description", `%${f.keyword.trim()}%`);
        }

        // Date range
        if (f.dateFrom) {
          query = query.gte("activity_date", f.dateFrom);
        }
        if (f.dateTo) {
          query = query.lte("activity_date", f.dateTo);
        }

        // Movement type
        if (f.movementType) {
          query = query.eq("movement_type", f.movementType);
        }

        // Amount range
        if (f.amountMin) {
          query = query.gte("amount", parseFloat(f.amountMin));
        }
        if (f.amountMax) {
          query = query.lte("amount", parseFloat(f.amountMax));
        }

        // Category
        if (f.categoryId) {
          query = query.eq("category_id", f.categoryId);
        }

        // Account
        if (f.accountId) {
          query = query.eq("account_id", f.accountId);
        }

        // Pagination
        const rangeStart = page * PAGE_SIZE;
        const rangeEnd = rangeStart + PAGE_SIZE - 1;
        query = query.range(rangeStart, rangeEnd);

        const { data, error, count: totalCount } = await query.abortSignal(
          controller.signal,
        );

        if (error) {
          setState({ status: "failure", message: error.message });
          setSearchLoading(false);
          return;
        }

        const rows = (data ?? []) as unknown as TxRow[];
        const hasMore = rows.length === PAGE_SIZE;

        setState((prev) => ({
          status: "success" as const,
          rows: append
            ? (prev.status === "success" ? [...prev.rows, ...rows] : rows)
            : rows,
          totalCount: totalCount ?? 0,
          hasMore,
        }));
        setSearchLoading(false);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setState({ status: "failure", message: "資料載入異常" });
        setSearchLoading(false);
      }
    },
    [supabase],
  );

  const handleSearch = useCallback(() => {
    currentFiltersRef.current = { ...filters };
    currentSortRef.current = { field: sortField, dir: sortDir };
    pageRef.current = 0;
    loadedRef.current = true;
    doSearch(false);
  }, [filters, sortField, sortDir, doSearch]);

  const handleLoadMore = useCallback(() => {
    if (state.status !== "success" || !state.hasMore) return;
    doSearch(true);
  }, [state, doSearch]);

  const handleSortChange = useCallback(
    (field: SortField, dir: SortDir) => {
      setSortField(field);
      setSortDir(dir);
      currentSortRef.current = { field, dir };
      if (loadedRef.current) {
        pageRef.current = 0;
        doSearch(false);
      }
    },
    [doSearch],
  );

  const handleClear = useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS });
    currentFiltersRef.current = { ...DEFAULT_FILTERS };
    setState({ status: "idle" });
    pageRef.current = 0;
    loadedRef.current = false;
  }, []);

  const updateFilter = useCallback(
    (key: keyof Filters, value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const handleUpdated = useCallback(() => {
    // Re-fetch current page
    doSearch(false);
  }, [doSearch]);

  /* ───────── Auto-load on mount ───────── */
  useEffect(() => {
    if (auth.authStatus === "signed_in" && supabase) {
      handleSearch();
    }
    // Only run once on sign-in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authStatus === "signed_in"]);

  return (
    <div className="db-page">
      {/* ===== Header ===== */}
      <div className="d-header">
        <div>
          <h2 className="d-title">
            📋 交易列表
          </h2>
          <p className="d-desc">完整查詢、篩選、排序與編輯所有交易記錄</p>
        </div>
      </div>

      {auth.authStatus !== "signed_in" ? (
        <p className="status-message status-muted" role="status">
          請先登入以查看交易列表。
        </p>
      ) : (
        <>
          {/* ===== Filters ===== */}
          <div className="d-card">
            <div className="d-card-h">
              <span className="d-card-t">🔎 篩選條件</span>
            </div>
            <div className="txs-filters-grid">
              {/* Keyword */}
              <div className="txs-field">
                <label className="txs-label">關鍵字</label>
                <input
                  className="txs-input"
                  type="text"
                  placeholder="搜尋描述…"
                  value={filters.keyword}
                  onChange={(e) => updateFilter("keyword", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                />
              </div>

              {/* Date from */}
              <div className="txs-field">
                <label className="txs-label">日期從</label>
                <input
                  className="txs-input"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilter("dateFrom", e.target.value)}
                />
              </div>

              {/* Date to */}
              <div className="txs-field">
                <label className="txs-label">日期至</label>
                <input
                  className="txs-input"
                  type="date"
                  max={todayStr()}
                  value={filters.dateTo}
                  onChange={(e) => updateFilter("dateTo", e.target.value)}
                />
              </div>

              {/* Movement type */}
              <div className="txs-field">
                <label className="txs-label">類型</label>
                <select
                  className="txs-input"
                  value={filters.movementType}
                  onChange={(e) => updateFilter("movementType", e.target.value)}
                >
                  <option value="">全部</option>
                  <option value="income">收入</option>
                  <option value="expense">支出</option>
                </select>
              </div>

              {/* Amount min */}
              <div className="txs-field">
                <label className="txs-label">金額（最小）</label>
                <input
                  className="txs-input"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={filters.amountMin}
                  onChange={(e) => updateFilter("amountMin", e.target.value)}
                />
              </div>

              {/* Amount max */}
              <div className="txs-field">
                <label className="txs-label">金額（最大）</label>
                <input
                  className="txs-input"
                  type="number"
                  min="0"
                  placeholder="不限"
                  value={filters.amountMax}
                  onChange={(e) => updateFilter("amountMax", e.target.value)}
                />
              </div>

              {/* Category */}
              <div className="txs-field">
                <label className="txs-label">分類</label>
                <select
                  className="txs-input"
                  value={filters.categoryId}
                  onChange={(e) => updateFilter("categoryId", e.target.value)}
                >
                  <option value="">全部分類</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account */}
              <div className="txs-field">
                <label className="txs-label">帳戶</label>
                <select
                  className="txs-input"
                  value={filters.accountId}
                  onChange={(e) => updateFilter("accountId", e.target.value)}
                >
                  <option value="">全部帳戶</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="txs-field txs-field-actions">
                <label className="txs-label">&nbsp;</label>
                <div className="txs-btn-row">
                  <button
                    className="txs-btn txs-btn-primary"
                    onClick={handleSearch}
                    disabled={state.status === "loading"}
                    type="button"
                  >
                    {state.status === "loading" ? "搜尋中…" : "🔍 搜尋"}
                  </button>
                  <button
                    className="txs-btn txs-btn-secondary"
                    onClick={handleClear}
                    type="button"
                  >
                    ✕ 清除篩選
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Results ===== */}
          {state.status === "success" && (
            <div className="d-card" style={{ marginTop: "12px" }}>
              <div className="d-card-h">
                <span className="d-card-t">
                  📋 交易記錄（{state.totalCount} 筆）
                </span>
                <SortControls
                  sortField={sortField}
                  sortDir={sortDir}
                  onSortChange={handleSortChange}
                />
              </div>

              {state.rows.length === 0 ? (
                <p className="status-message status-muted">
                  查無符合條件的交易
                </p>
              ) : (
                <>
                  <div className="d-tx-list">
                    {state.rows.map((tx) => (
                      <TxItem
                        key={tx.id}
                        tx={tx}
                        categories={categories}
                        accounts={accounts}
                        supabase={supabase}
                        onUpdated={handleUpdated}
                      />
                    ))}
                  </div>

                  {state.hasMore && (
                    <div className="txs-loadmore-wrap">
                      <button
                        className="txs-btn txs-btn-loadmore"
                        onClick={handleLoadMore}
                        disabled={searchLoading}
                        type="button"
                      >
                        {searchLoading ? "載入中…" : "載入更多"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {state.status === "loading" && (state as any).rows === undefined && (
            <div className="d-card" style={{ marginTop: "12px" }}>
              <p className="status-message status-muted" style={{ textAlign: "center", padding: "24px 0" }}>
                載入中…
              </p>
            </div>
          )}

          {state.status === "failure" && (
            <p className="status-message status-error" role="alert">
              {state.message}
            </p>
          )}
        </>
      )}
    </div>
  );
}
