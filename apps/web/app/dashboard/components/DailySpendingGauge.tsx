"use client";

import { useState } from "react";

type DailyLimitType = "custom" | "auto";

type DailySpendingGaugeProps = {
  spent: number;
  limit: number;
  type: DailyLimitType;
  onSetLimit: (amount: number) => Promise<void>;
  onResetToAuto: () => Promise<void>;
  isCurrentMonth: boolean;
};

function formatTWD(n: number): string {
  return `TWD ${Math.round(n).toLocaleString()}`;
}

function alertClass(spent: number, limit: number): "safe" | "caution" | "warning" | "exceeded" {
  if (limit <= 0) return "safe";
  const ratio = spent / limit;
  if (ratio > 1) return "exceeded";
  if (ratio >= 0.85) return "warning";
  if (ratio >= 0.6) return "caution";
  return "safe";
}

function parseLimitInput(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) return null;
  return amount;
}

export function DailySpendingGauge({
  spent,
  limit,
  type,
  onSetLimit,
  onResetToAuto,
  isCurrentMonth,
}: DailySpendingGaugeProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState(limit > 0 ? String(Math.round(limit)) : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const level = alertClass(spent, limit);
  const remaining = limit - spent;
  const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
  const progressValue = limit > 0 ? Math.min(Math.max(spent, 0), limit) : 0;
  const blinkClass = level === "exceeded" ? " daily-gauge-blink" : "";

  function openModal() {
    setInputValue(limit > 0 ? String(Math.round(limit)) : "");
    setError("");
    setModalOpen(true);
  }

  async function handleSetLimit() {
    const parsed = parseLimitInput(inputValue);
    if (parsed == null) {
      setError("請輸入大於 0 的 TWD 整數");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSetLimit(parsed);
      setModalOpen(false);
    } catch {
      setError("設定失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetToAuto() {
    setSaving(true);
    setError("");
    try {
      await onResetToAuto();
      setModalOpen(false);
    } catch {
      setError("恢復自動估算失敗，請稍後再試");
    } finally {
      setSaving(false);
    }
  }

  if (limit <= 0) {
    return (
      <div className="daily-gauge-empty">
        ⚠️ 請先設定月預算以取得每日限額
      </div>
    );
  }

  return (
    <>
      <section className="daily-gauge-wrap" aria-label={isCurrentMonth ? "今日花費" : "本月每日花費"}>
        <div className="daily-gauge-header">
          <span>{isCurrentMonth ? "📅 今日花費" : "📅 本月每日花費"}</span>
          <span className={`daily-gauge-header-remaining ${level}`}>
            {remaining >= 0 ? `剩 ${formatTWD(remaining)}` : `超支 ${formatTWD(Math.abs(remaining))}`}
          </span>
        </div>

        <div className={`daily-gauge-amount ${level}${blinkClass}`}>
          {formatTWD(spent)}
        </div>

        <div className="daily-gauge-bar-track">
          <progress
            className={`daily-gauge-bar-progress ${level}${blinkClass}`}
            value={progressValue}
            max={limit}
            aria-label="每日限額使用率"
          />
        </div>
        <div className="daily-gauge-percent">{percent}%</div>

        <div className="daily-gauge-footer">
          <span>每日限額</span>
          <button className="daily-gauge-footer-right" onClick={openModal} type="button">
            <span>{formatTWD(limit)}</span>
            <span className={`daily-gauge-badge ${type === "auto" ? "daily-gauge-badge-auto" : ""}`}>
              {type === "custom" ? "⚙️手動" : "⚡自動"}
            </span>
          </button>
        </div>
      </section>

      {modalOpen ? (
        <div className="daily-gauge-modal-overlay" role="presentation">
          <div className="daily-gauge-modal" role="dialog" aria-modal="true" aria-labelledby="daily-gauge-modal-title">
            <h3 id="daily-gauge-modal-title">設定每日限額</h3>
            <input
              className="daily-gauge-modal-input"
              inputMode="numeric"
              pattern="[0-9]*"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="TWD"
              aria-invalid={error ? "true" : "false"}
            />
            {error ? <div className="daily-gauge-modal-error">{error}</div> : null}
            <div className="daily-gauge-modal-actions">
              <button
                className="daily-gauge-modal-btn daily-gauge-modal-btn-primary"
                onClick={handleSetLimit}
                disabled={saving}
                type="button"
              >
                設定
              </button>
              {type === "custom" ? (
                <button
                  className="daily-gauge-modal-btn daily-gauge-modal-btn-danger"
                  onClick={handleResetToAuto}
                  disabled={saving}
                  type="button"
                >
                  恢復自動估算
                </button>
              ) : null}
              <button
                className="daily-gauge-modal-btn daily-gauge-modal-btn-cancel"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                type="button"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
