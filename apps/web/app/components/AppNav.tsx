"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="app-nav">
      <Link
        href="/"
        className={`app-nav-link ${pathname === "/" ? "app-nav-link--active" : ""}`}
      >
        快速記錄
      </Link>
      <Link
        href="/dashboard"
        className={`app-nav-link ${pathname === "/dashboard" ? "app-nav-link--active" : ""}`}
      >
        儀表板
      </Link>
      <Link
        href="/budgets"
        className={`app-nav-link ${pathname === "/budgets" ? "app-nav-link--active" : ""}`}
      >
        預算
      </Link>
    </nav>
  );
}
