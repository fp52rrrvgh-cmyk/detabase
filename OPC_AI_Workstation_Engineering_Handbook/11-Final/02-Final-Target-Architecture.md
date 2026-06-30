# 11-Final / 02 Final Target Architecture

## 最終目標

```text
晚上交代 Objective
→ OPC 自主規劃與執行
→ 夜間保存 Evidence、成本與失敗
→ 早上產生 Morning Report
→ CEO 只做決策與驗收
```

## 最終架構

```text
Windows 11 Host
├─ Daily Desktop / Gaming
├─ PowerShell / Windows Terminal
├─ VS Code / Git / GitHub CLI
├─ WSL2 Ubuntu
│  ├─ Linux toolchain
│  ├─ Runtime workers
│  └─ AI development environment
├─ Docker Desktop
│  ├─ PostgreSQL
│  ├─ Redis Streams
│  ├─ Runtime API
│  ├─ Workflow workers
│  └─ Observability services
└─ D:\OPC
   ├─ projects
   ├─ runtime
   ├─ artifacts
   ├─ knowledge
   ├─ logs
   ├─ sandbox
   ├─ backups
   └─ tools
```

## 控制平面

- Objective Store
- Workflow Runtime
- Capability Registry
- Policy Engine
- Tool Gateway / MCP Gateway
- Approval Service
- Scheduler

## 執行平面

- Planner
- Researcher
- Engineer
- Operator
- Reviewer

## 資料平面

- PostgreSQL：durable state
- Redis Streams：queue 與 event delivery
- Git：code、docs、ADR
- Artifact Store：報告、測試與輸出
- Evidence Store：可驗證完成證據

## 核心不變條件

- 沒有 Evidence，不算完成。
- 沒有 Capability，不可執行。
- 沒有 Approval，不做高風險操作。
- 沒有 Checkpoint，不允許長任務無限執行。
- 沒有 Backup，不做不可逆變更。
- 沒有 Doctor PASS，不恢復營運。

## ChatGPT 與外部 AI

ChatGPT、Hermes、Codex、OpenHands 或其他模型與工具都不是架構本身。它們只是可替換的外部協作者、入口或 Worker。OPC 的真實來源必須存在於 repository、database、queue、policy 與 evidence 中。