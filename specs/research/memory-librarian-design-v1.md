# 小馬記憶與誠實思考系統 — 設計 v3

**版本**: v3 | **日期**: 2026-05-31 | **狀態**: Design (final pre-implementation)
**設計歷程**: v1 (5 engines) → v2 (+ClawMem+Obsidian) → v3 (分層架構+adapter)

---

## 0. 核心架構：四層投影

```
┌──────────────────────────────────────────────────────────┐
│ Layer 0: event_log（唯一事實來源）                       │
│ 所有決策、糾正、audit、指令都先寫 event_log             │
│  immutable, append-only                                 │
├──────────────────────────────────────────────────────────┤
│ Layer 1: governed memory（誠實引擎管控的事實視圖）       │
│  從 event_log 過濾、驗證、標註可信度後的「小馬知道的事」   │
│  這是誠實思考引擎用的資料                                │
├──────────────────────────────────────────────────────────┤
│ Layer 2: ClawMem（檢索引擎 + 知識圖譜）                  │
│  混合檢索 + 向量 + rerank + KG                         │
│  產出的是 evidence candidate，不是 fact                │
│  誠實引擎可以降權、拒用、要求重查                        │
├──────────────────────────────────────────────────────────┤
│ Layer 3: Obsidian（視覺化蜘蛛網）                        │
│  governed memory 的 Graph View 投影                     │
│  [[wikilinks]] 表達關聯，frontmatter 表達 typed edge    │
│  Phase 1: read-only export                              │
│  Phase 2: 受控雙向（schema validation + 小新裁決）       │
└──────────────────────────────────────────────────────────┘
```

每層只做一件事，資料只能往下流（event_log → 下層），不能往上汙染。

---

## 1. Codex Audit v2 Findings 修正（6/6）

### Finding 1: ClawMem 改成 Adapter 模式

ClawMem 定位：**檢索引擎 + 知識圖譜後端**，不是記憶權威來源。

```yaml
ClawMem 可以做:
  ✅ 儲存與索引知識片段
  ✅ BM25 + vector + reranker 混合檢索
  ✅ 知識圖譜遍歷（causal / semantic / temporal）
  ✅ Confidence scoring for retrieval ranking
  ✅ Hermes MemoryProvider plugin 整合

ClawMem 不可以做:
  ❌ 決定什麼是事實（由誠實引擎管）
  ❌ 自主編碼 event（由 event_log 管）
  ❌ 產出 Verified 標籤（由誠實引擎管）
  ❌ 替換 event_log 的事實來源地位
```

### Finding 2: SoT 分層定義

| 層 | 名稱 | 誰控制 | 可信度 | 可否修改 |
|:--:|:-----|:-------|:------|:--------|
| L0 | event_log | 小馬（append-only） | ✅ 原始事實 | ❌ 不可刪改 |
| L1 | governed memory | 誠實引擎 | ✅ Verified/Inferred/Uncertain | 可修正（tombstone） |
| L2 | ClawMem | ClawMem | ⚠️ retrieval score | 可重索引 |
| L3 | Obsidian | 小新（可視化） | ⚠️ 投影 | Phase 2 可控 |

### Finding 3: ClawMem Acceptance Criteria

```
P-1 Spike 驗收標準：

1. recall@5 ≥ 0.8（對測試集的 recall 正確率）
2. provenance round-trip：存入的記憶 recall 回來時保留 source 標籤
3. supersede 行為：被取代的記憶不應出現在 top-5 recall
4. prompt injection bypass：含有 injection 的內容不應被 recall 到
5. 安裝時間 < 15 分鐘（npm install -g clawmem）
6. Hermes plugin 整合後，agent tool 可正常 query
```

### Finding 4: Obsidian Note Schema

```yaml
---
id: "evt-20260531-001"
type: "decision"                    # decision | audit | correction | preference
status: "active"                    # active | superseded | archived
confidence: "verified"              # verified | inferred | uncertain
source_event_id: "evt-20260531-001"
created_at: "2026-05-31"
relations:                         # typed edges for Graph View
  - type: "supersedes"             # supports | contradicts | supersedes | caused_by
    target: "evt-20260530-005"
    confidence: 0.95
  - type: "caused_by"
    target: "evt-20260529-010"
    confidence: 0.85
tags: [memory, decision, phase1b]
---
```

Graph View 中的每條邊都帶語意，不是只有「有關聯」。

### Finding 5: 記憶 Confidence ≠ 誠實 Verified

```
ClawMem confidence = retrieval ranking signal
  (0.0-1.0, based on BM25 score + vector similarity + recency + co-activation)

誠實引擎 Verified = 事實正確性擔保
  (四項都要成立: source_exists + claim_truth + freshness + authority)

兩者關係：
  ClawMem 給出「這可能是相關的」
  誠實引擎決定「這是真的/推論的/不確定的」
```

### Finding 6: 工時修正 30-50h

| Phase | 內容 | 時程 |
|:------|:------|:----:|
| P-1 | ClawMem spike + schema mapping + failure modes | 4-8h |
| P0 | event log + evidence contract + 防幻覺閘門 | 4-6h |
| P1 | ClawMem adapter（不內嵌業務規則） | 4-6h |
| P2 | eval set + benchmark threshold | 4-6h |
| P3 | tombstone / supersede mapping | 3-5h |
| P4 | Obsidian read-only graph export | 4-6h |
| P5 | response pipeline gate 整合 | 4-6h |
| P6 | Obsidian 受控雙向（延後） | 4-6h |
| **總計** | | **30-50h** |

---

## 2. 蜘蛛網架構

小新的比喻完全映射到 v3 的四層架構：

```
知識點 = governed memory 中的一條記錄
蜘蛛絲 = typed relation（supports / contradicts / supersedes / caused_by）
碰到知識點 = 誠實引擎 recall 或你點 Obsidian node
整張網動起來 = KG traversal + Graph View 更新
```

ClawMem 負責讓蜘蛛絲知道誰跟誰連著（KG traversal），Obsidian 負責讓你看到整張網長什麼樣子。

---

## 3. 誠實思考引擎整合

```
使用者輸入
    │
    ▼
L1 governed memory 提供已知事實（附可信度）
    │
    ▼
L2 ClawMem 提供相關候選（附 retrieval score）
    │
    ▼
誠實引擎 整合兩者
    ├── 有 source + 高 confidence → Verified
    ├── 有 source + 低 confidence → Inferred
    ├── 無 source → 拒用／要求重查
    └── ClawMem candidate vs governed memory 衝突 → 誠實引擎裁決
```

---

## 4. 結論

| 項目 | 結果 |
|:-----|:------|
| 6/6 Codex findings 修正 | ✅ |
| ClawMem 定位 | ✅ Adapter 模式，檢索引擎 + KG |
| SoT 層次 | ✅ 四層(event_log→governed→retrieval→viz) |
| Obsidian 定位 | ✅ 視覺化投影層，非事實層 |
| 工時 | ✅ 30-50h |
| 是否需要下一輪 audit | ✅ 建議 — v3 可最終審查 |
| 是否可以進 P-1 spike | ✅ 設計足夠進入 ClawMem spike |

---

**本文件為純設計。ClawMem（MIT）作為檢索後端候選。**
