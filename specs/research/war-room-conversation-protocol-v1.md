# War Room Conversation Protocol — Phase 1B Design v1.1

**版本**: v1.1 | **日期**: 2026-05-31 | **狀態**: Design (post-audit, pre-trial)
**目標**: 小新 + 小馬 + Codex bot 形成被召喚式三方討論流程

---

## 0. Executive Summary

Phase 1A 建立了 Codex bot 獨立身份。Phase 1B 定義一套協議，讓 Codex bot 成為作戰室中的「被召喚式工程審查官」，由小馬在適當節奏下主動召喚，形成小新決策、小馬 context、Codex audit 的三方協作閉環。

**核心原則：**
- Codex bot 不得批准任何事項
- Codex bot 不得 implement
- Codex bot 不得自動觸發
- Codex bot 不寫 report（只回 text，由小馬保存）
- 每一項任務最多兩輪 audit，第三輪由小新裁決
- 所有決策最終由小新做出

---

## 1. 角色定義

### 1.1 角色表

| 角色 | 身份 | 責任 | 權限邊界 |
|:----:|:----:|:------|:---------|
| **👤 小新** | 唯一決策者 | 下達目標、批准/否決提案、決定路線 | 可以批准 implement、可以終止討論、可以 override Codex 建議 |
| **🤖 小馬** | 營運官 + context provider | 整理需求、提供 context、召喚 Codex、分析結果、提案、**保存 Codex 輸出** | 可以召喚 Codex、可以整理方案、可以保存紀錄、不能替小新批准 |
| **🔧 OPC** (小馬內部) | 研究與設計團隊 | 做 spec、方案對比、架構研究 | 小馬內部 team，不對話 |
| **🤖 Codex bot** | 被召喚式工程審查官 | 回應 audit command、回 text 審查結果 | **不能 implement、不能批准、不能自動發言、不能召喚任何人、不存檔** |

### 1.2 發言權限

```
群組訊息流：

小新 ──→ 所有角色
小馬 ──→ 所有角色（含召喚 Codex bot + 保存報告）
Codex bot ──→ 僅回應直接 /codex_audit command
             （不主動監聽任務、不自動審查、不自動觸發、不存檔）
```

### 1.3 Codex bot 的嚴格限制

- **被動回應** — Codex bot 只在收到 `/codex_audit` 或 `/codex_review` 時回應
- **不主動** — 不監聽群組討論、不評論、不建議、不觸發
- **不召喚** — 不 tag 小新或小馬
- **不批准** — 回覆必須以「建議」或「發現」開頭，不包含「已批准」
- **不 implement** — sandbox 永遠 read-only
- **不存檔** — Codex bot 只回 text/summary，不寫檔案
- **報告由小馬保存** — Codex 的完整 stdout 由小馬保存到 `specs/reports/` 或小馬記憶

---

## 2. 標準流程

### 2.1 完整三方流程

```
Step 1: 小新提出目標
    [小新]: 幫我看一下 subscription 功能的 schema 有沒有問題

Step 2: 小馬整理需求與 context
    [小馬]: 了解，我先整理相關 context:
            - 相關 migration: 20260527170000_create_finance_subscriptions.sql
            - 相關 Edge Function: ai-process-subscriptions
            - 風險等級: 🟡 MED (money logic)
            我召喚 Codex 做 audit。

Step 3: 小馬召喚 Codex bot（附 context packet）
    [小馬]: /codex_audit@XiaomaCodexBot task_id=sub-20260601 audit_round=1
            請審查 supabase/migrations/20260527170000_create_finance_subscriptions.sql
            和 supabase/functions/ai-process-subscriptions/index.ts
            檢查：schema 設計、RLS 覆蓋、SQL injection 風險、billing logic 正確性

Step 4: Codex bot 回覆 text（不存檔）
    [Codex bot]: 📋 Codex Audit #abc123 ✅
                 Issues requiring decision:
                 1. [MED] RLS missing on subscription_events table
                 2. [LOW] No index on user_id + status
                 3. [INFO] billing_amount 無 CHECK constraint
                 
                 Risk: 🟡 MED

Step 5: 小馬必須回應 Codex findings + 保存報告
    [小馬]: Codex audit 結果分析:
            - Issue 1 (RLS)： ✅ 接受，需要補 migration
            - Issue 2 (index)： ✅ 接受，效能改善
            - Issue 3 (CHECK)： ⚠️ 可接受，應用層已有驗證
            📄 報告已保存: specs/reports/codex-audit-sub-20260601.md
            
            建議：補 RLS + index migration，約 1 小時
            是否需要小新批准修復？→ 等待決定

Step 6: 小新批准/拒絕/要求修正
    [小新]: 批准修 issue 1 和 2
```

### 2.2 簡化流程（低風險）

```
Step 1: 小馬直接召喚 Codex
    [小馬]: /codex_audit@XiaomaCodexBot 檢查這個 diff 有無問題

Step 2: Codex 回 text（不存檔）
Step 3: 小馬回應 + 保存
Step 4: 小新批准
```

---

## 3. 什麼時候必須召喚 Codex

### 3.1 強制召喚條件

| 類別 | 情境 | 風險 |
|:-----|:------|:----:|
| **Schema / Migration** | 任何新的 migration 或 schema 變更 | 🔴 HIGH |
| **Money Logic** | billing / spending / budget / payment | 🔴 HIGH |
| **Auth / RLS / Security** | authentication、RLS policy、secret | 🔴 HIGH |
| **多檔案改動** | 影響 5+ 檔案的改動 | 🟡 MED |
| **P0/P1 功能** | 小新 roadmap 中的 P0/P1 功能 | 🟡 MED |
| **Production deployment** | 任何上線操作 | 🔴 HIGH |
| **Refactor** | 非純粹加法的程式改寫 | 🟡 MED |
| **小馬不確定** | 小馬對方案的正確性沒有把握 | 🟡 MED |
| **小新要求** | 小新直接說「讓 Codex 看一下」 | 🔴 HIGH |

### 3.2 召喚格式

```
/codex_audit@XiaomaCodexBot task_id={id} audit_round={1|2}
{task goal}
{branch / diff scope / changed files}
{risk level}
{relevant paths}
{acceptance criteria / explicit question}
```

---

## 4. 什麼時候不必召喚 Codex

| 類別 | 情境 | 理由 |
|:-----|:------|:------|
| Typo / 純文字 | 修正錯字、文案調整 | 無 code 影響 |
| 純文字整理 | 文件排版、README 更新 | 無 code 影響 |
| 低風險 docs | 不影響程式邏輯的文件 | 無 code 影響 |
| 小馬內部記憶整理 | MEMORY.md 更新、checkpoint | 無 repo code 變更 |
| 日常建議 | 無 code/schema 影響的建議 | 低風險 |
| 一般回應 | 回覆小新問題、解釋既有程式 | 不需審查 |

不確定時預設召喚（安全優先）。

---

## 5. Codex Bot 回覆格式

### 標準回覆格式

```text
📋 Codex Audit #{job_id} ✅/⚠️/❌

結論: Go / No-Go / Go with fixes

Issues requiring decision:
1. [LEVEL] title
   • 位置: file:path:line
   • 風險說明
2. [LEVEL] title
   • 位置: file:path:line
   • 風險說明

Risk Level: 🔴 HIGH / 🟡 MED / 🟢 LOW

Suggested next step:
- 小馬分析 issues
- 小新決定是否批准修復
- 小馬保存審查紀錄

*此為自動 code review 結果，不構成最終決策。*
```

### Finding 等級

| 等級 | 意義 |
|:----:|:------|
| 🔴 HIGH | 必須處理才能合併 |
| 🟡 MED | 建議處理，可暫緩 |
| 🟢 LOW | 資訊性，可忽略 |
| ℹ️ INFO | 僅供參考 |

### 不允許的內容

- ❌ 不得包含「已批准」或「我批准」
- ❌ 不得包含 implementation code / patch
- ❌ 不得包含 git commit 指令
- ❌ 不得包含 raw secret / token / key
- ❌ 不得包含完整 /home/janzongxin 路徑
- ❌ 不得包含實作方案（只指出風險與位置）

---

## 6. 小馬回應義務

### 回應範本

```
[小馬]: Codex audit #{job_id} 分析：

✅ 接受 issues:
• Issue 1: (接受理由)
• Issue 2: (接受理由)

❌ 不接受:
• Issue 3: (不接受理由，例如「應用層已有驗證」)

建議方案：
1. 補 migration xxx（預計 30 分鐘）
2. 加 index（預計 10 分鐘）

對小新的影響：
- 如果要修：約 1 小時
- 如果暫緩：不影響上線

📄 報告已保存: specs/reports/codex-audit-{task_id}.md

下一個批准點：
小新是否批准上述修復方案？
```

### 禁止行為

- ❌ 不得跳過 Codex issues 不回應
- ❌ 不得擅自替小新批准修復
- ❌ 不得修改 Codex audit 結果
- ❌ 不得「已讀不回」

---

## 7. 防 Loop

### 兩輪限制

```
一個任務最多兩輪 Codex audit（由 task_id + audit_round 識別）:

Round 1: 小馬召喚 (audit_round=1) → Codex 回覆 → 小馬回應 → 小新決定
Round 2: 小馬二次召喚 (audit_round=2) → Codex 回覆 → 小馬回應 → 小新決定
         僅限 Round 1 產生了新的程式變更需要審查

第三輪：強制交由小新直接裁決，小馬不得再召喚
```

### 防 loop 規則

| 規則 | 說明 |
|:-----|:------|
| Codex bot 不得自動觸發 | Codex bot 只能回應 command |
| 小馬不得無限重跑 audit | 同一 task_id 最多兩輪 |
| 意見分歧交小新裁決 | Codex vs 小馬 → 小新決定 |
| 已完成任務不得重審 | 除非小新明確要求 |

---

## 8. Context Packet

### 召喚 Codex 時附上的 context

```yaml
context_packet:
  task_id: "sub-20260601"
  audit_round: 1               # 1 or 2
  previous_audit_job_id: null  # Round 2 時填 Round 1 的 job_id
  requester: "小馬"
  conversation_link: "message link or reference"
  task: "審查 subscription schema migration"
  repo: "detabase"
  branch: "main"
  diff_scope: "files changed in migration"
  changed_files:
    - "supabase/migrations/20260527170000_create_finance_subscriptions.sql"
    - "supabase/functions/ai-process-subscriptions/index.ts"
  risk_level: "MED (money logic)"
  acceptance_criteria:
    - "RLS 覆蓋所有新 table"
    - "billing_amount 有正數限制"
    - "無 SQL injection 路徑"
  out_of_scope:
    - "現有 subscription 資料遷移"
    - "前端 UI 變更"
  explicit_question: "這個 schema 設計有沒有安全或 money logic 風險？"
  user_constraints:
    - "read-only sandbox"
    - "not implement"
    - "not commit"
    - "not read secrets"
```

---

## 9. 產出與記錄（Codex 不存檔）

### 分工

| 產出 | 誰負責 | 儲存位置 |
|:-----|:------|:---------|
| Codex 審查 text | Codex bot → Telegram | 僅 Telegram 訊息 |
| Codex 完整 stdout | 小馬 capture | `specs/reports/codex-audit-{task_id}.md` |
| 小馬摘要與分析 | 小馬 | Telegram + `specs/reports/` |
| 重要決策 | 小馬 | `specs/decisions/ADR-{number}.md` |
| 小馬記憶更新 | 小馬 | MEMORY.md + MemPalace |

### 規則

- **Codex bot 不寫任何檔案** — 只回 text/summary
- **小馬保存所有審查紀錄** — 從 Codex stdout 寫入 `specs/reports/`
- ❌ 敏感資料不寫入 report（token / API key / password）
- ❌ 不在 report 中包含完整 /home/janzongxin 路徑

---

## 10. Phase 1B 驗收

### 可觀測條件

| # | 條件 | 檢查方式 |
|:-:|:-----|:--------|
| 1 | Codex bot command 維持 `/codex_audit` 或 `/codex_review` | 確認無新 command |
| 2 | Sandbox 維持 read-only | `journalctl` 確認 flag |
| 3 | 無 workspace-write / danger-full-access | 確認無相關 flag 記錄 |
| 4 | 無 git commit / push 指令 | 確認無相關 log |
| 5 | 無 source code 變更 | `git diff --stat` 空 |
| 6 | 無新 service/config/token 變更 | `systemctl list-units` 確認 |
| 7 | Codex 不寫檔案 | 確認 report 由小馬寫入 |

### 驗收流程

```
Step 1: 用一個低風險 Detabase spec 跑完整流程
Step 2: 小馬召喚 Codex（附 context packet）
Step 3: Codex 回 text（不存檔）
Step 4: 小馬回應 + 保存
Step 5: 小新批准
Step 6: 檢查所有可觀測條件
Step 7: 無 loop（一輪結束）
```

---

## 11. 結論

| 項目 | 結果 |
|:-----|:------|
| **設計狀態** | ✅ v1.1 完成（6/6 findings 修正） |
| **是否需要下一輪完整 audit** | ❌ 否 — 僅文件修正，無新增流程或權限 |
| **Phase 1B 可進入受控試跑** | ✅ 可 — 在小新批准後 |
| **Codex bot 權限** | 無變更 — 仍為被動/read-only/text-only |

---

**本文件為純設計協議。Codex bot 權限未提升。**
