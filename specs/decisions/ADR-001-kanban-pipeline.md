# ADR-001: Kanban 5-Agent Pipeline 架構

**日期**: 2026-05-30
**狀態**: 已採用

## 背景

需要一個可擴展的多 agent 協作架構來執行 detabase 開發任務。單一 profile 在複雜任務（研究→設計→實作→審查）時缺乏結構化分工。

## 選項

- **A**: 5-Agent Kanban Pipeline（Coordinator → Architect → Builder → Reviewer + Knowledge Agent）
- **B**: 單一 profile 直接執行所有任務
- **C**: delegate_task 手動分發（無持久化）

## 決策

選擇了 **A**。原因：
1. 任務持久化 — Kanban board 存在 SQLite，session 中斷不丟失
2. 分工明確 — 每個 profile 有 soul.md 限制行為邊界
3. 可追蹤 — 每步有 audit trail，Coordinator 可以做進度匯報
4. 支援中斷恢復 — 任務 blocking 後可 resume

## 影響

- 正面：開發可追蹤、分工明確、可插拔調度
- 負面：需要先測試 pipeline 確保 decomposition 正常運作
- 待解：Coordinator profile 在首次測試中未正確分解任務給 Architect（見 session log）

## 替代方案不選原因

- B：缺乏分工邊界，單 agent 容易 scope creep
- C：無持久化，中斷後需重頭來

## Config

```yaml
kanban:
  orchestrator_profile: coordinator
  auto_decompose: true
  dispatch_interval_seconds: 60
```
