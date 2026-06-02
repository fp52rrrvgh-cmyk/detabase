# War Room Protocol 試跑計畫 v1 — Detabase Dashboard IA Review

**版本**: v1 | **日期**: 2026-06-01 | **狀態**: 角色對齊版，待 Codex 審查 + 小新批准
**任務**: 低風險試跑完整工作流（小馬提案→Codex審查→共識圖紙→小新批准→施工監督→驗收）

---

## 1. 任務選擇

**任務**: Detabase Dashboard 資訊架構審查
**風險等級**: 🟢 LOW（純架構審查，無實作、無 schema 變更、無 migration）
**目標**: 驗證小新 → 小馬 → Codex bot → 小馬 → 小新的完整三方協作流程

### 選擇理由

| 評估項 | 結果 |
|:-------|:-----|
| 需改 code？ | ❌ |
| 需改 schema/migration？ | ❌ |
| 需改 token/ACL/systemd？ | ❌ |
| 需 commit/push？ | ❌ |
| 風險等級 | 🟢 LOW |
| 小新需批准 | ✅ |

---

## 2. 小馬 Context Packet

```yaml
schema_version: 1
event_id: "generate-on-trial"
task_id: "dash-ia-trial-v1"
audit_round: 1
requester: "小馬"
review_type: "spec"
objective: "審查 Detabase Dashboard 資訊架構草案"
repo: "detabase"
base_ref: "main"
target_ref: "working tree"
changed_files_with_reason:
  - path: "apps/web/app/dashboard/page.tsx"
    reason: "主要 Dashboard 頁面"
  - path: "apps/web/app/dashboard/hooks/useDashboard.ts"
    reason: "資料層"
  - path: "specs/references/detabase-gas-gap-analysis.md"
    reason: "GAS 差距分析參考"
acceptance_criteria:
  - "IA 涵蓋現有功能（P0-3、P0-4、P1）"
  - "MVP scope ≤ 2 週開發"
  - "保留 mobile-first 設計"
test_evidence:
  - command: "N/A — read-only audit"
    result: "not_run"
risk_level: "LOW"
out_of_scope:
  - "任何 code 修改"
  - "任何 schema/migration 修改"
  - "任何實作"
explicit_question: "Detabase Dashboard 的資訊架構是否適合進行 MVP 重構？"
decision_required: true
requested_decision_owner: "小新"
constraints:
  - "read-only"
  - "no implement"
  - "no file changes"
known_constraints:
  - "no source edit"
  - "two-round max"
relevant_specs:
  - "specs/references/xiaoma-private-war-room-workflow-v2.md"
  - "specs/references/detabase-ai-boundary-v1.md"
ai_advice_loop_note: "AI advice loop lives in 小馬, not Detabase"
prior_findings: []
```

---

## 3. Codex Bot Audit Prompt

```
/codex_audit read only review of Detabase Dashboard information architecture.
Read apps/web/app/dashboard/page.tsx and hooks/useDashboard.ts.
Evaluate:
1) Current IA coverage for daily command needs
2) Decision panel maturity (Briefing + DailySpendingGauge)
3) Balance snapshot layout and hierarchy
4) Month switcher UX semantic correctness
5) Mobile first-screen priority
6) 2-week MVP scope feasibility

Output: Go / No-Go / Go with fixes. Max 5 findings.
No implementation plan beyond high-level recommendation.
Read exact full paths. Do not read secrets. No commands that write files.
```

---

## 4. 小馬回應模板

```
📋 Codex Audit #{job_id} 分析

✅ 接受:
  • Finding 1: ...
  • Finding 2: ...

❌ 不接受:
  • Finding 3: ...（理由）

修正後 IA 草案摘要：
...
對小新的影響：
- 如果要修：約 X 小時

📄 報告: specs/reports/codex-audit-dash-ia-trial-v1.md

下一個批准點：小新是否批准上述方向？
```

---

## 5. 小新批准模板

```
小新，請批准 / 修正 / 暫停：

[ ] 批准試跑方向（不授權 code/schema/service 變更）
[ ] 修正：...
[ ] 暫停
```

---

## 6. 驗收標準

| # | 標準 | 檢查方式 |
|:-:|:-----|:---------|
| 1 | 完整跑完小馬→Codex→小馬→小新 | 流程紀錄 |
| 2 | 無 loop（不超過 2 輪） | job log |
| 3 | Codex bot 無 implement | job 記錄 |
| 4 | Codex 無要求改 code | 回覆內容 |
| 5 | git diff --stat 空 | terminal 檢查 |
| 6 | 報告無敏感資料 | 人工檢查 |
| 7 | 小馬保存對話摘要 | specs/reports/ |

---

## 7. 不得做的事

- ❌ 不改任何 source code
- ❌ 不改 schema / migration
- ❌ 不改 bot token / ACL / systemd
- ❌ 不改 codex-bot code
- ❌ 不新增 service
- ❌ 不 git commit / push
- ❌ 不 implement mode
- ❌ 不 workspace-write
- ❌ 不 danger-full-access

---

*本文件待 Codex final review + 小新批准。*
