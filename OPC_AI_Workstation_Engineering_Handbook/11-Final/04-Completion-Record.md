# 11-Final / 04 Completion Record

## 手冊狀態

本工程手冊已完成「可開始實機建置」所需的主線整理：

- Windows 11 全新安裝與驗收
- 雙 SSD、BitLocker、D:\OPC、備份與還原
- Git、GitHub CLI、VS Code、Python/uv、Node/pnpm
- WSL2、Docker Desktop、Compose 與資料持久化
- 可執行的 Workspace Bootstrap、總 Bootstrap 與 verify-all
- PostgreSQL + Redis Runtime foundation
- Bare-metal rebuild 與 Full-System Acceptance

## 必須區分的兩件事

### 1. Handbook Ready

代表：

- 可以依主線開始重灌與建置。
- 危險操作有停止條件。
- 基礎工具有逐步驗收。
- Bootstrap 與 verify-all 有可執行入口。
- Runtime foundation 有 Compose 範本與驗證方式。

### 2. OPC Autonomous Runtime Ready

只有以下應用層真正實作並實測後才能宣告：

- Objective API / CLI
- Workflow checkpoint / resume
- Redis Streams consumer group 與重複投遞保護
- Capability Registry
- Tool Gateway
- Agent session isolation
- Evidence / reviewer / morning report
- HITL 與 default-deny

目前手冊已把這些能力定義清楚，但不假裝它們已經被程式實作完成。

## 實機建置入口

```text
11-Final/01-Master-Index.md
```

必要腳本：

```text
scripts/bootstrap-opc-workspace.ps1
scripts/bootstrap.ps1
scripts/verify-all.ps1
scripts/opc-control.ps1
```

Runtime foundation 範本：

```text
templates/opc-core-compose.yaml
```

## 實機完成條件

1. 依 Master Index 逐步施工。
2. `scripts/bootstrap.ps1` 各 phase 完成。
3. `scripts/verify-all.ps1` 沒有 FAIL。
4. PostgreSQL、Redis 與 Compose 持久化測試通過。
5. 備份與 database 還原測試通過。
6. `11-Final/03-Full-System-Acceptance.md` 完成簽核。

若 Autonomous Runtime 尚未實作，實機結果應標記：

```text
CONDITIONAL / READY FOR OPC APPLICATION DEVELOPMENT
```

只有 Autonomous Runtime 與 Recovery rehearsal 都通過，才標記：

```text
PASS / OPC AI WORKSTATION READY
```

## 維護規則

- 架構真的改變才建立 ADR。
- 重複發生且值得固定處理的故障才建立 Runbook。
- 不為了紀錄進度新增狀態垃圾文件。
- 軟體版本敏感步驟在施工當天重新核對官方文件。
- 每次實機建置保存 Handbook commit SHA 與 verification report。

## 最終定義

```text
手冊可施工
+ 腳本可執行
+ 基礎環境可重建
+ Runtime foundation 可驗證
+ 備份可還原
= READY FOR OPC APPLICATION DEVELOPMENT
```

```text
上述全部
+ Autonomous Runtime 已實作
+ Evidence / HITL / Security 邊界實測
+ Bare-metal recovery rehearsal 通過
= OPC AI WORKSTATION READY
```
