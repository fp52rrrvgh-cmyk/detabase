# 小新 → 小馬 → Codex 分工鏈與工作流

> 生效日期：2026-05-31 | 更新需小新批准

---

## 角色定義

### 👑 小新（產品 Owner）
- 決定做什麼、不做什麼
- 給方向、批方案、定優先級
- 一句話就能啟動或停止一件事
- **最終驗收標準的定義者**

### 🧠 小馬（參謀部 + 情報官 + 營運官）
- 接收小新的意圖，拆解成可行任務
- 研究、調查、分析選項，回報給小新決定
- 寫 spec / 設計方案
- 把核准的方案派給 Codex 執行
- 監控進度、管 Kanban、維護系統
- 審查 Codex 的產出，確認品質再回報小新
- 小新不在時維持系統運作

### ⚙️ Codex（主工程師 + 架構師 + 審查官）
- **主要透過小馬接任務，但最終對小新的目標與驗收標準負責**
- 如果 spec 偏離小新的真實使用情境，Codex audit 必須指出
- 兩種模式：
  - **Codex Audit**（唯讀審查）— 審 spec、審實作、抓問題，輸出 report / risk / 方案比較
  - **Codex Implement**（實作寫入）— 照 spec 寫 code、跑 build、跑 test，輸出 code / diff / commit proposal
- commit 必須經批准或符合既定流程，不是每次必然

---

## 風險分級流程

### 🔴 高風險 — 完整流程
**涵蓋：** schema / migration / money / auth / RLS / 多檔案改動 / P0 功能

```
小新：「做 OOO」
  → 小馬研究、出方案
  → 小新批准方案
    → 小馬寫 spec → Codex Audit 審 spec
      → 小馬依 audit 修正 → 小新確認 spec
        → Codex Implement 實作
          → Codex Audit 審實作
            → 小馬驗證 → 小新驗收
```

### 🟢 低風險 — 簡化流程
**涵蓋：** docs / typo / CSS 小修 / template 調整 / 單純重構 / 無 side effect 的單檔案修改

```
小新：「修 OOO」
  → 小馬確認風險等級（無須方案階段）
    → 小馬直接實作或派 Codex 處理
      → 小馬驗證 → 回報小新
```

*低風險任務不需要 spec、不需要 audit、不需要小新逐層批准。*
*但如果執行中發現影響超出預期，立刻升高至完整流程。*

---

## 流程規則

1. **Codex 的最終責任對象是小新** — 如果 spec 偏離真實使用情境，Codex audit 必須指出，即使小馬已經批准
2. **Codex 輸出格式取決於模式**：
   - Audit → report / risk / 方案比較
   - Implement → code / diff / build result / test result / commit proposal
   - commit 不必然發生，需經批准或符合既定流程
3. **風險分級由小馬判斷**，不確定時問小新
4. **低風險任務卡住或發現副作用** → 自動升為完整流程
5. **每步有檢查點**，不會讓 Codex 直接跳進 coding 沒人管
