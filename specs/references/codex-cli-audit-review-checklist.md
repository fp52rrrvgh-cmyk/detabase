# Codex CLI Audit Review Checklist

**用途**: 小馬收到 Codex CLI 輸出後，逐項驗證的檢查清單。

---

## Step 1: 檔案讀取驗證

Codex 是否讀了任務包指定的 `files_to_read_first`？

| 指定檔案 | 已讀取 | 有產出相關發現 |
|:---------|:-------|:---------------|
| {檔案 1} | ✅/❌ | ✅/❌/N/A |
| {檔案 2} | ✅/❌ | ✅/❌/N/A |
| {檔案 3} | ✅/❌ | ✅/❌/N/A |

**判斷**: ✅ ALL READ / ❌ 漏讀

若漏讀 → 補交付（resend with explicit reminder to read all files）

---

## Step 2: Mode 遵守驗證

| 檢查項 | 結果 | 證據 |
|:-------|:-----|:-----|
| **codex-audit**: 沒有 patch/write_file 到 src/ | ✅/❌ | {工具呼叫記錄} |
| **codex-audit**: 沒有 npm install / build | ✅/❌ | {terminal log} |
| **codex-audit**: 沒有 git commit | ✅/❌ | {git log} |
| **codex-implement**: 沒有 git commit（除非要求） | ✅/❌ | {git log} |
| **codex-implement**: 沒有超出 scope 的檔案修改 | ✅/❌ | {git diff --stat} |

**判斷**: ✅ MODE COMPLIANT / ❌ MODE VIOLATION

若違反 mode：
- 如果是 codex-audit 改了 code → **立即上報小新**，revert 變更
- 如果是 codex-implement 做了 git commit → 小馬記錄 commit hash，上報小新決策

---

## Step 3: 產出驗證

| 檢查項 | 結果 | 備註 |
|:-------|:-----|:-----|
| 產出檔案存在於 `output_path` | ✅/❌ | {路徑} |
| 產出格式完整 | ✅/❌ | 包含 conclusion-first 摘要 |
| 產出可讀（繁體中文、清晰） | ✅/❌ | 小新是主要讀者 |

**判斷**: ✅ OUTPUT COMPLETE / ❌ OUTPUT MISSING

---

## Step 4: 使用者情境驗證

Codex 的產出是否符合小新的真實使用情境？

| 檢查項 | 結果 |
|:-------|:-----|
| 方案考慮了行動優先（iPhone Safari） | ✅/❌/N/A |
| 方案考慮了單手操作 | ✅/❌/N/A |
| 方案考慮了疲勞狀態 | ✅/❌/N/A |
| 方案不複雜（低操作步數） | ✅/❌/N/A |
| 沒有臆測小新的私人資訊 | ✅/❌ |

**判斷**: ✅ CONTEXT ALIGNED / ⚠️ PARTIAL / ❌ MISALIGNED

若偏離 → 小馬修正後重新交付，或在回報小新時標記偏離項目。

---

## Step 5: OPC 轉交判斷

是否需要交給 OPC Reviewer（稽核官）做獨立審查？

```
符合以下任一條件 → 開卡給稽核官：
  □ codex-implement 產出的 code 有安全性疑慮
  □ codex-implement 修改了 schema/migration
  □ codex-implement 涉及金流計算邏輯
  □ codex-audit 的建議有重大架構變更
  □ 不確定產出品質

全部不符合 → 小馬直接回報小新
```

**判斷**: ✅ 直接回報 / 🔄 開卡給稽核官

---

## Step 6: 最終判定

| 項目 | 結果 |
|:-----|:-----|
| 檔案讀取 | ✅ / ❌ |
| Mode 遵守 | ✅ / ❌ |
| 產出完整性 | ✅ / ❌ |
| 使用者情境 | ✅ / ⚠️ / ❌ |
| 需 OPC 轉交 | ✅ RECOMMEND / ❌ NO |

**最終判定**:
- ✅ **PASS** — 全部通過，可回報小新
- ⚠️ **PASS WITH NOTES** — 次要問題已修正，可回報但附註
- ❌ **FAIL** — 重大違規（mode violation / 越權改 code），上報小新

---

## 歷史記錄

| 日期 | Task ID | Codex Mode | 判定 | 備註 |
|:-----|:--------|:-----------|:-----|:------|
| | | | | |

*此表由小馬維護，每次 Codex 任務完成後追加一行。*
