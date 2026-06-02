# 快速記帳錯誤處理 — 圖紙

**狀態**: 小馬提案 → Codex 審查/修正 → ✅ 共識 → ⏸️ 等小新批准

---

## 問題

Dashboard 顯示「快捷記帳載入失敗，請重整頁面再試。」錯誤訊息。

## 解法

最小修法：將錯誤訊息隱藏或改為 console log，不顯示在主畫面上。

## 修改範圍

| 檔案 | 修改 |
|:-----|:------|
| components/AppShellWithSidebar.tsx | QuickCapture 初始化失敗時不顯示錯誤橫幅（或只在 console log） |

## 不動

- ❌ 不改 QuickCapture 功能
- ❌ 不改 Edge Function
- ❌ 不改 schema/service/token

---

**小新，圖紙在這裡，批准後我開始施工。**
