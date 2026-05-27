"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { BudgetsTab } from "./BudgetsTab";
import { SubscriptionsTab } from "./SubscriptionsTab";
import { CategoriesTab } from "./CategoriesTab";

type TabId = "budgets" | "subscriptions" | "categories";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "budgets", label: "預算", icon: "🎯" },
  { id: "subscriptions", label: "固定訂閱", icon: "🔄" },
  { id: "categories", label: "分類", icon: "🏷️" },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("budgets");

  return (
    <div className="db-page">
      <div className="d-header">
        <div>
          <h2 className="d-title">⚙️ 設定</h2>
          <p className="d-desc">管理分類、預算與固定訂閱</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="settings-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`settings-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <span className="settings-tab-icon">{tab.icon}</span>
            <span className="settings-tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="settings-content">
        {activeTab === "budgets" && <BudgetsTab />}
        {activeTab === "subscriptions" && <SubscriptionsTab />}
        {activeTab === "categories" && <CategoriesTab />}
      </div>
    </div>
  );
}
