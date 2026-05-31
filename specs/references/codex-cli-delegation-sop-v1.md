# Codex CLI Delegation SOP v1

**日期**: 2026-05-31 | **範圍**: 小馬 → Codex CLI 任務交付與驗收

---

## 目的

讓小馬（參謀部）可以安全調用 Codex CLI 做工程審計與實作，減少小新人工傳訊負擔，同時確保：
- 審計任務不會意外改 code
- 實作任務只在小新批准後才啟用
- 每次任務都有完整 traceability

---

## 兩種模式

### 1. codex-audit（審計模式）

**啟用條件**: 直接可用，不需小新批准

**可做**:
- 讀取檔案（schema、code、config）
- 分析架構、資料流、餘額計算路徑
- 搜尋相關技術文件
- 產出審計報告（markdown）

**禁止**:
- ❌ `patch` 任何檔案
- ❌ `write_file` 到 `src/`、`app/`、`migrations/`、`.ts`/`.tsx`/`.py`/`.sql`
- ❌ `npm install` / `pip install` / 任何套件安裝
- ❌ `git commit` / `git push`
- ❌ `terminal` 執行 migration

**適用場景**:
- 第一輪 schema 審計
- 架構判斷（某功能是否支援）
- 風險分析
- 技術方案比較

### 2. codex-implement（實作模式）

**啟用條件**: 小新批准 approved spec 後，由小馬手動指定

**可做**:
- 讀寫 `src/`、`app/`、`components/`、`migrations/` 等實作檔案
- `patch` 程式碼
- `npm run build` / `npm test`
- 小範圍實作（單一功能、單一 migration）

**禁止**:
- ❌ `git commit`，除非小新明確在任務包中要求
- ❌ 超出 task_id scope 的檔案修改
- ❌ schema 變更未經 migration 流程

**適用場景**:
- 小新確認 spec 後的實作
- 已知範圍的 bug fix

---

## 任務包必須包含的欄位

每次交付 Codex 時，小馬必須產出完整的 task package：

```
task_id              # 唯一識別碼（ex: P0-001-audit）
mode                 # codex-audit 或 codex-implement
repo_path            # 專案絕對路徑
goal                 # 一句話目標
scope                # 範圍描述（什麼做、什麼不做）
files_to_read_first  # 優先讀取的檔案清單
forbidden_actions    # 明確禁止行為（違反即任務失敗）
output_path          # 報告/產出寫到哪裡
acceptance_criteria  # 驗收條件清單
user_context         # 小新的使用情境、限制、偏好
handoff_back_format  # Codex 回報格式要求
```

---

## 交付流程

```
小新提出需求
  ↓
小馬判斷模式：
   需要審計？       → codex-audit（直接執行）
   需要實作？       → 先審計 → 小新確認 spec → codex-implement
  ↓
小馬包裝 task package（依模板）
  ↓
codex exec --full-auto '<task_package>'
  ↓
Codex 執行任務，輸出到 output_path
  ↓
小馬做二次驗證（見 checklist）
  ↓
需要 OPC Reviewer？ → 開卡給 OPC 稽核官
  ↓
回報小新結果
```

---

## 二次驗證（小馬收到 Codex 輸出後必做）

1. ✅ Codex 是否讀了 `files_to_read_first` 指定的檔案？
2. ✅ Codex 是否遵守了 `mode` 的行為限制？（audit 沒改 code？implement 沒 git commit？）
3. ✅ 是否有任何範圍外的檔案被修改？
4. ✅ 產出是否寫到指定的 `output_path`？
5. ✅ 產出是否符合小新的真實使用情境？（開車、單手、疲勞）
6. ✅ 是否需要交給 OPC Reviewer（稽核官）做獨立審查？

若任一項 FAIL：
- 小馬修正問題後重新交付
- 若問題涉及安全/越權，上報小新

---

## 安全邊界

- Codex CLI sandbox 預設 read-only → codex-audit 天然安全
- codex-implement 必須用 `--full-auto` 但只在小新批准後執行
- 不交付含有 API key、token、session 的任務包
- Codex 的輸出若包含 env 值、UUID、token，小馬必須過濾後才回報小新
