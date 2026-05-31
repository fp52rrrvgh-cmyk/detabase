# detabase Knowledge Base

## 目錄

```
specs/
├── decisions/           ← ADR 架構決策紀錄
│   └── ADR-TEMPLATE.md
├── research/            ← 技術研究報告
│   └── 2026-05-29-multi-agent-patterns.md
├── references/          ← 實作參考資料（schema、API 文件等）
├── assumptions.md       ← 未驗證假設追蹤
└── session-template.md  ← 開發日誌範本
```

## 使用規則

1. **每個設計決定** → 寫 ADR 到 `decisions/`
2. **每個技術研究** → 寫報告到 `research/`
3. **每個開發 session** → 寫日誌摘要
4. **不確定的假設** → 寫到 `assumptions.md`
5. **Knowledge Agent** 負責維護此目錄

## 命名慣例

- ADR: `ADR-NNN-title.md`（三位數流水號）
- 研究報告: `YYYY-MM-DD-topic-slug.md`
- 開發日誌: `YYYY-MM-DD.md`
