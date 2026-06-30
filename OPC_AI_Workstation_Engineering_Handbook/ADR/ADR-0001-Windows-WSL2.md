# ADR-0001：採用 Windows 11 + WSL2 作為 OPC AI Workstation 基礎

## Status

Accepted

## Context

使用者需要：

- 保留 Windows 日常方便性。
- 保留遊戲能力。
- 能執行 AI Agent / Docker / Linux CLI。
- 不想再次承受 Linux Desktop 維護成本。
- 希望重灌後可從零重建。

## Decision

採用：

```text
Windows 11 Host + WSL2 Ubuntu + Docker
```

而不是：

- Linux Desktop
- Dual Boot
- 純 Windows 開發環境

## Consequences

### 優點

- 保留遊戲與日常使用體驗。
- AI runtime 可在 Linux 環境運作。
- Docker 與 WSL2 可以承接大部分開源工具。
- 對小白維護成本較低。

### 缺點

- WSL2 / Docker / Windows 之間仍有邊界。
- 路徑管理必須嚴格規範。
- 高階 Linux 問題仍可能需要排查。

## Follow-up

後續 ADR：

- ADR-0002：Storage 不採用真正合併磁碟。
- ADR-0003：Workspace 統一為 `D:\OPC`。
- ADR-0004：Docker Desktop + WSL2 backend。
