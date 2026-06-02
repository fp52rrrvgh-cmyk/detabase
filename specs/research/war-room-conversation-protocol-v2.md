# AI 作戰室協作協議 — 小馬 + Codex bot 討論總結 v2.0

**日期**: 2026-06-01 | **狀態**: 小馬 + Codex bot 雙向討論完成，待小新起床驗收

---

## 討論過程

| Round | 方向 | 結果 |
|:-----:|:-----|:------|
| Round 1 | 小馬提出 Phase 1B 協議草案 5 項評估 | Codex bot 給出 5 點完整審查意見 |
| Round 2 | 小馬回應意見，提出調整方案 | Codex bot 強化安全閘門 + 角色邊界建議 |

---

## 最終協議要點

### 角色定義

| 角色 | 身份 | 權限邊界 |
|:----:|:----:|:---------|
| **小新** | 唯一決策者 | 可以批准 implement、可以終止討論、可以 override 任何建議 |
| **小馬** | 營運官 + context provider | 可以召喚 Codex、可以整理方案、可以保存紀錄、不能替小新批准、不能用拆任務繞過強制審查 |
| **Codex bot** | 被召喚式工程審查官 | 只能被動回應 command、只審風險不批准上線、不寫檔案不出 code |

### 強制審查條件

| 類別 | 門檻 |
|:-----|:------|
| Schema / DB 調整 | 任何 migration 或 schema 變更 |
| 金流邏輯 | budget / spending limit / subscription / payment / reconciliation |
| 權限 | Auth / RLS / GRANT / service role / JWT / ACL |
| 多檔案改動 | 5+ source files 或跨前後端+Edge Function+DB 任兩層 |
| P0/P1 功能 | Roadmap 中的 P0/P1 |
| Production 操作 | deployment / cron / destructive SQL / data backfill |
| 小馬不確定 | 預設升級為需審查 |

### Context Packet 格式

```yaml
task_id: "xxx"
audit_round: 1               # 1 or 2
parent_task: null            # round 2 時填 round 1 task_id
requester: "小馬"
review_type: "spec|diff|security"
base_ref: "main"
target_ref: "working tree"
changed_files_with_reason:
  - path: "..."
    reason: "why relevant"
prior_findings:
  - job_id: "..."
    status: "accepted|rejected|deferred"
test_evidence:
  - command: "npm test"
    result: "pass/fail/not_run"
acceptance_criteria:
  - "RLS 覆蓋所有新 table"
risk_level: "HIGH / MED / LOW"
known_constraints:
  - "no source edit"
  - "two-round max"
decision_required: true
requested_decision_owner: "小新"
```

### 防 Loop 機制

- 同一 task_id 最多兩輪 audit
- Round 2 需有新 diff / 新決策 / 小新要求
- Round 3 強制交小新裁決
- parent_task_link 防 task_id 繞過
- Round 2 後仍有 HIGH finding → 小新選擇：修 / 接受風險 / 降 scope / 停止

### 安全閘門（4 層）

| 層級 | 機制 | 說明 |
|:----:|:-----|:------|
| L1 | Command allowlist | 只允許 audit/review/status/help/cancel |
| L2 | Intent gate | 擋 implement/edit/commit/push/deploy/delete/read secret 等 20+ 關鍵字 |
| L3 | Path denylist | 擋 .env / .key / credential / token / secret 等路徑 |
| L4 | Output redaction | Telegram + report + log 全部遮罩，高 confidence pattern 整份 quarantine |

### 雙向通訊架構

```
小馬 ──trigger.json──→ Codex bot
Codex bot ──reply.json──→ 小馬（小馬可讀取 ✅）
Codex bot ──HTTP API──→ Telegram 群組（小新可看到 ✅）
小馬 ──Telegram──→ 群組（小新可看到 ✅）
```

---

## 待小新驗收項目

- [ ] 角色邊界是否接受
- [ ] 強制審查條件門檻是否合理
- [ ] Context Packet 格式是否完整
- [ ] 防 loop 機制是否足夠
- [ ] 安全閘門強度是否滿意
- [ ] 雙向通訊架構是否可用
- [ ] 是否批准進 Phase 1B 試跑

*本協議由小馬 + Codex bot 經 trigger.json/reply.json 雙向橋接討論產出。*
