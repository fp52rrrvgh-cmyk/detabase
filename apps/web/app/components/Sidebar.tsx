"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "📊 總覽" },
  { href: "/quick-capture", label: "✏️ 快捷記帳" },
  { href: "/quick-capture", label: "📋 記帳列表", badge: 8 },
  { href: "/quick-capture", label: "🏦 帳戶" },
  { href: "/categories", label: "🏷️ 分類" },
  { href: "/budgets", label: "🎯 預算" },
  { href: "#", label: "⚙️ 設定" },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger — only visible on mobile */}
      <button
        className="sb-hamburger"
        onClick={() => setOpen(true)}
        aria-label="開啟選單"
        type="button"
      >
        <span className="sb-hamburger-line" />
        <span className="sb-hamburger-line" />
        <span className="sb-hamburger-line" />
      </button>

      {/* Overlay — mobile only, closes sidebar */}
      {open && (
        <div className="sb-overlay" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sb-sidebar ${open ? "sb-sidebar--open" : ""}`}>
        {/* Close button — mobile only */}
        <button
          className="sb-close-btn"
          onClick={() => setOpen(false)}
          aria-label="關閉選單"
          type="button"
        >
          ✕
        </button>

        <div className="sb-logo">
          <span className="sb-logo-icon">◆</span>
          <span className="sb-logo-text">database</span>
        </div>

        <nav className="sb-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={`sb-item ${isActive ? "active" : ""}`}
                onClick={() => setOpen(false)}
              >
                {item.label}
                {item.badge != null && (
                  <span className="sb-badge">{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sb-user">
          <div className="sb-avatar">🧑</div>
          <div className="sb-user-info">
            <div className="sb-user-name">個人模式</div>
            <div className="sb-user-status">已登入</div>
          </div>
        </div>
      </aside>
    </>
  );
}
