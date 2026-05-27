"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "📊 總覽" },
  { href: "/transactions", label: "📋 記帳列表" },
  { href: "/accounts", label: "🏦 帳戶" },
  { href: "/reconciliation", label: "✅ 對帳" },
  { href: "/settings", label: "⚙️ 設定" },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/";
    if (href === "/settings") return pathname.startsWith("/settings") || pathname === "/budgets" || pathname === "/subscriptions" || pathname === "/categories";
    return pathname === href;
  }

  return (
    <>
      {/* Overlay — mobile only */}
      {open && <div className="sb-overlay" onClick={onClose} />}

      {/* Desktop sidebar (hidden on mobile) */}
      <aside className="sb-sidebar">
        <div className="sb-logo">
          <span className="sb-logo-icon">◆</span>
          <span className="sb-logo-text">DB</span>
        </div>
        <nav className="sb-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`sb-item ${isActive(item.href) ? "active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sb-user">
          <div className="sb-avatar">🧑</div>
          <div className="sb-user-info">
            <div className="sb-user-name">個人模式</div>
            <div className="sb-user-status">已登入</div>
          </div>
        </div>
      </aside>

      {/* Mobile dropdown menu — appears below hamburger */}
      <nav className={`sb-dropdown ${open ? "sb-dropdown--open" : ""}`}>
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className={`sb-dropdown-item ${isActive(item.href) ? "active" : ""}`}
            onClick={onClose}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

export { NAV_ITEMS };
