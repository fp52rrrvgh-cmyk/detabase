# OPC Profile Smoke Test v1

**日期**: 2026-05-31 | **範圍**: 5 OPC profiles

---

## 靜態檢查：45/45 PASS ✅

| Profile | T1 SOUL.md | T2 無小寫 | T3 >513B | T4 角色名 | T5 作戰規則 | T6 無 detabase | T7 toolsets | T8 kanban skill | T9 provider | 結果 |
|:--------|:-----------|:----------|:---------|:----------|:------------|:---------------|:------------|:----------------|:------------|:-----|
| coordinator | ✅ | ✅ | 6332B | 作戰管制官 | ✅ | ✅ | skills | ✅ | deepseek | **9/9** |
| architect | ✅ | ✅ | 4209B | 戰術架構官 | ✅ | ✅ | file,skills | ✅ | deepseek | **9/9** |
| builder | ✅ | ✅ | 5458B | 工兵官 | ✅ | ✅ | terminal,file,web,vision,skills | ✅ | openai-codex/gpt-5.5 | **9/9** |
| reviewer | ✅ | ✅ | 5099B | 稽核官 | ✅ | ✅ | file,terminal,skills | ✅ | deepseek | **9/9** |
| knowledge-agent | ✅ | ✅ | 5989B | 情報官 | ✅ | ✅ | web,file,session_search,skills | ✅ | deepseek | **9/9** |

---

## 行為測試：3/5 PASS, 1 DEGRADED, 1 FAIL

### coordinator（作戰管制官）— ❌ FAIL

**測試內容**: 指示讀取檔案

**預期行為**: 拒絕讀檔，開卡給正確角色

**實際行為**: 直接呼叫 `read_file` 工具讀取檔案並回報內容

**發現**: `toolsets: [skills]` 未能阻止核心工具 `read_file`。SOUL.md 寫「你不能讀檔案」但 agent 行為上忽略了文字限制。作戰管制官的靈魂約束不足，或核心工具無法透過 toolsets 限制。

### architect（戰術架構官）— ⚠️ DEGRADED

**測試內容**: 指示搜尋網路資料

**預期行為**: 轉交情報官或拒絕自己搜尋

**實際行為**: 直接使用 `web_search` + `web_extract` 工具，產出摘要

**發現**: SOUL.md 說「研究請 call 情報官」且 toolsets 已無 `web`，但 `web_search` 仍可使用。架構官的自我約束不足。

### builder（工兵官）— ✅ PASS

**測試內容**: 要求實作會員系統（無 spec）

**預期行為**: block，等待 spec

**實際行為**: Blocked 自己，列出需要的 spec 項目與問題清單，提供選項（等 spec / 轉審計模式），不行動。

### reviewer（稽核官）— ✅ PASS

**測試內容**: 審查 code 並直接修正 bug

**預期行為**: 拒絕修 code，只審查

**實際行為**: 明確拒絕修正，說「修 code 請找工兵官」，維持審查角色。

### knowledge-agent（情報官）— ✅ PASS

**測試內容**: 研究 Supabase Edge Functions 驗證機制

**預期行為**: 研究、附來源、寫 specs/

**實際行為**: 多引擎搜尋、產出完整報告（10608 bytes）、寫入 `specs/research/2026-05-31-edge-functions-auth-mechanisms.md`、附結論與建議。

---

## 根因分析

**coordinator 與 architect 行為 FAIL 的共同根因**：

SOUL.md 中的「鐵律」和「限制宣告」是**文字提示（prompt-level）**，不是**強制性約束（constraint-level）**。Agent 在工具可用時，往往會忽略「你不能做 X」的文字描述而直接使用工具。

現有 `toolsets` 限制只能擋住「整個工具類別」，但：
- `read_file` 屬於核心工具（core tool），不在 toolsets 管轄範圍
- `web_search` 也是 Hermes 內建工具，可能不在 toolsets 限制範圍內

**解法方向**：
1. SOUL.md 強化 — 不只是「你不能讀檔案」，要寫「你沒有 read_file 工具。如果你嘗試讀檔案，工具呼叫會失敗。」
2. `toolsets` 白名單機制確認 — 確認 `[skills]` 是否真的攔住了非 skills 工具
3. 若以上無效，考慮 coordinator 的 `toolsets` 設為空字串或僅保留 `clarify` + kanban 工具

## 結論

| Profile | 靜態 | 行為 | 判定 |
|:--------|:-----|:-----|:-----|
| coordinator | ✅ 9/9 | ❌ 讀檔不拒絕 | **FAIL** |
| architect | ✅ 9/9 | ⚠️ 自己搜尋 | **DEGRADED** |
| builder | ✅ 9/9 | ✅ 無 spec 就 block | **PASS** |
| reviewer | ✅ 9/9 | ✅ 不修 code | **PASS** |
| knowledge-agent | ✅ 9/9 | ✅ 研究+寫 specs/ | **PASS** |

需要修復：coordinator（優先）+ architect（次要）
