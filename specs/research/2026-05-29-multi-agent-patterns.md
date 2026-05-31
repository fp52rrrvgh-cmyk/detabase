# 2026-05-29 多 Agent 協作架構深度研究報告

## 結論
業界一致認為 Coordinator → Architect → Builder → Reviewer + Knowledge Agent 是最有效的軟體開發 agent 分工模式。我們的設計完全符合最佳實踐。

## 來源

| source | 機構 | 核心觀點 |
|--------|------|---------|
| Building Effective AI Agents | Anthropic | Orchestrator-Workers 模式：中央 LLM 拆任務、分配、整合。開始簡單，需要再加 complexity |
| Agentic Workflows for SDLC | QuantumBlack (McKinsey) | 兩層模型：確定性編排在 agent 外面跑，agent 不決定順序。Knowledge Agent 模式是關鍵 |
| My LLM coding workflow 2026 | Addy Osmani (Google) | Spec 先於 code、TDD、小塊迭代、人留迴圈、多模型協作 |
| Multi-Agent Architecture Patterns | Augment Code | Hub-Spoke（我們的 pattern）、Mesh、Hierarchical 三種拓撲。Hub-Spoke 最適合單一 orchestrator |
| 3-Agent Team (Reddit 實戰) | ClaudeAI community | Architect + Builder + Reviewer 「stupidly effective and token-efficient」 |

## 對比表：我們 vs 業界最佳實踐

| 維度 | 業界建議 | 我們 |
|:----|:---------|:----|
| 分工模式 | Orchestrator-Workers | ✅ Coordinator → 4 worker |
| 編排 | 確定性，agent 不決定順序 | ✅ Coordinator 決定 |
| Knowledge Agent | 獨立 agent 回答問題 + 記錄假設 | ✅ 已加入 |
| 模板驅動 spec | 每個 feature 產 spec.md | ✅ specs/ 目錄 + 模板 |
| 雙層審查 | 確定性檢查 + Critic agent | ✅ Reviewer 做雙層 |
| 失敗循環 | 3-5 次重試後升到人類 | ✅ Builder 3 次後 block |
| 平行執行 | 無相依任務同時 fan-out | ✅ Coordinator 用 parents 參數 |
| ADR | 每個決策寫 Architecture Decision Record | ✅ specs/decisions/ |
| Artifact 追蹤 | .sdlc/ 或 specs/ 目錄 | ✅ specs/ 目錄 |

## 發現的潛在弱點

1. **Waterfall 風險** — 嚴格順序 pipeline 在功能小迭代時可能 overhead 太大。快速修正不需要 5 個人。Coordinator 應判斷跳過不需要的階段。

2. **Context 累積** — 長 pipeline 中後面的 agent 可能缺乏前面的 context。Solution：spec 文件要夠完整。

3. **Token 成本** — 5 個 agent 各跑一輪 = 5x token。需要評估是否每次都需要全部人。

## 建議
- 快速修正（typo、小 bug）：直接小馬處理，不走 pipeline
- 中等功能（新分類、新欄位）：Coordinator → Builder → Reviewer
- 大型功能（新模組、新頁面）：Coordinator → Knowledge Agent → Architect → Builder → Reviewer → Knowledge Agent(記錄)
