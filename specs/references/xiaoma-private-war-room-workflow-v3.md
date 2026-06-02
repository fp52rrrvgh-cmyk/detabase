# 小馬 Private War Room 工作流正式化 v3

**版本**: v3 | **日期**: 2026-06-01 | **狀態**: 角色重定義，待 Codex 審查 + 小新批准
**修正**: 對齊新工作流定義（小馬=第一大腦／Codex=第二大腦／共同圖紙／階段卡點）

---

## 1. 角色分工（新定義）

```
小新 = 方向 / 最終批准
小馬 = 第一大腦（記憶 + 判斷 + 規劃 + OPC 團隊）
Codex = 第二大腦（工程審查 + 反駁 + 修正 + 監督照圖施工）
```

### 核心鐵律

| 角色 | 擁有 | 不擁有 |
|:-----|:------|:--------|
| **小新** | 方向、批准、選擇 | 技術細節（不必） |
| **小馬** | 記憶、判斷、規劃、OPC 調度、方案提案 | 越過 Codex 審查自行施工、自行批准下一階段 |
| **Codex** | 工程審查、反駁、方案修正、監督照圖施工 | 批准決策、跳過小新驗收、自行施工 |
| **Base** | 事實資料、結構化數據 | 記憶、脈絡、建議 |

---

## 2. 完整工作流

### 標準流程（8 步驟）

```
Step 1: 小新提出目標或問題
  ↓
Step 2: 小馬（第一大腦）提出方案草案
  ↓
Step 3: Codex（第二大腦）審查、反駁、修正 → 雙方討論
  ↓
Step 4: 達成共識 → 產出圖紙（共同產出，非單方決定）
  ↓
Step 5: 小新審查圖紙 → 批准 / 修正 / 暫停
  ↓
Step 6: 小馬照圖施工（可用 OPC 團隊）
  ↓
Step 7: Codex 監督施工（確保照圖、沒跑偏）
  ↓
Step 8: 小新最終驗收
```

### 階段卡點（不可跳過）

| 卡點 | 誰決定 | 可繼續條件 |
|:-----|:------|:-----------|
| 方案共識 | 小馬 + Codex | 雙方對方案無異議 |
| 圖紙定稿 | 小新 | 小新批准圖紙 |
| 施工完成 | Codex 監督通過 | Codex 確認照圖施工 |
| 最終驗收 | 小新 | 小新驗收通過 |

### 禁止行為

- ❌ 小馬跳過 Codex 審查直接施工
- ❌ Codex 跳過小新批准自行決定
- ❌ 任何一方單方面決定圖紙
- ❌ 自動升級到下一階段

---

## 3. Private War Room Boundary

Telegram 作戰室僅允許三位成員：

| 身份 | 說明 |
|:-----|:------|
| 小新 | 人類，唯一最終批准者 |
| 小馬 bot | 第一大腦 |
| Codex bot | 第二大腦 |

### 邊界規則（不變）

- 非白名單 user → reject + audit log
- 群組成員變更 → SAFE_LOCKED
- 轉發訊息 → reject
- ACL fail-closed

---

## 4. Context Packet 格式（不變，v2 規格沿用）

```yaml
schema_version: 1
event_id: "uuid"
task_id: "string"
parent_task: null
audit_round: 1
requester: "小馬 或 Codex"
review_type: "spec|diff|security|migration"
objective: "審查目標"
repo: "detabase"
base_ref: "main"
target_ref: "working tree"
changed_files_with_reason:
  - path: "path/to/file"
    reason: "why relevant"
acceptance_criteria:
  - "條件 1"
prior_findings:
  - job_id: "..."
    status: "accepted|resolved|deferred|rejected"
risk_level: "LOW / MED / HIGH"
decision_required: true
requested_decision_owner: "小新"
```

---

## 5. 防 Loop 機制

| 規則 | 說明 |
|:-----|:------|
| 同一 task 最多兩輪審查 | Round 3 強制交小新裁決 |
| parent_task 防繞過 | 新 task 須引用 parent_task |
| Round 2 後仍有 HIGH | 小新選擇：修 / 接受風險 / 降 scope / 停止 |
| 階段不可自動升級 | 每階段完成後停等小新 |
| Codex 不單方面批准 | 只能給建議和風險判斷 |

---

## 6. 安全閘門（4 層）

| 層級 | 機制 | 強度 |
|:----:|:-----|:----:|
| L1 | Command allowlist | ✅ 不可放 |
| L2 | Intent gate | ✅ 小新/小馬跳過（自由討論必要，output redaction 為最後防線） |
| L3 | Path denylist | ✅ 小新/小馬跳過 |
| L4 | Output redaction | ✅ 不可放 |

---

## 7. Codex Findings 回應與閉環

| 狀態 | 意義 | 責任人 |
|:-----|:------|:-------|
| accepted | 接受並修正 | 小馬 |
| resolved | Codex 確認已修復 | Codex |
| deferred | 暫緩 | 小馬（通知小新） |
| rejected | 不接受，附理由 | 小馬（小新可 override） |

小馬必須對每項 finding 逐一回應，不可跳過。

---

## 8. trigger.json 結構化格式

### 小馬 → Codex bot

```yaml
schema_version: 1
event_id: "uuid"
source: "xiaoma"
actor: "小馬"
intent: "propose | review_request | handoff | status_update"
requires_response: true
text: "內容"
```

### Codex bot → 小馬

```yaml
schema_version: 1
job_id: "uuid"
exit_code: 0
summary: "回覆"
report_path: "reports/..."
```

---

## 9. 小新批准點

- [ ] 方案共識（小馬 + Codex）
- [ ] 圖紙定稿
- [ ] 施工完成驗收
- [ ] 階段轉換
- [ ] 權限變更
- [ ] 新長期服務上線

---

*本文件 v3 已對齊新角色定義與工作流。待 Codex 審查 + 小新批准。*
