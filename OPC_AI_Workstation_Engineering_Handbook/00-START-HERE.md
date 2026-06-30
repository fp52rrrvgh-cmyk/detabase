# OPC AI Workstation 工程手冊

本目錄是 **Phase 1：OPC AI Workstation** 的正式工程手冊。

## 目標

建立一台以 Windows 11 為日常與遊戲基礎、以 WSL2 / Docker 承載 AI Runtime Foundation 的單人 AI 工作站。

Phase 1 的終點是：

```text
PASS / OPC AI WORKSTATION PHASE 1 READY
```

這代表工作站可重建、可驗證、可恢復，並可開始規劃未來 OPC Agent Runtime；不代表 Autonomous Runtime 已經實作。

## 唯一施工入口

真正重灌或建置時，不要依本頁逐目錄自由閱讀。

只從以下文件開始：

```text
11-Final/01-Master-Index.md
```

Master Index 會依施工順序指定每個階段應讀章節、執行指令、驗收方式與停止條件。

## 現行目錄

```text
00-START-HERE.md
01-Foundation/
02-Architecture/
03-Windows/
04-Storage/
05-Development/
06-WSL2-Docker/
07-AI-Runtime/
08-Bootstrap/
09-Operations/
10-Security-Recovery/
11-Final/
ADR/
runbooks/
scripts/
templates/
```

若其他文件使用與上述不一致的歷史目錄名稱，視為過期引用，不得用於施工。

## 核心原則

1. Windows 負責日常、遊戲、驅動、圖形介面與 Docker Desktop Host。
2. WSL2 負責 Linux 開發環境與 Linux 工具鏈。
3. Docker 負責隔離 PostgreSQL、Redis 與後續 Runtime 服務。
4. 所有工程與 AI 工作統一進入 `D:\OPC`。
5. 500GB SSD 規劃為 C: 系統碟，2TB SSD 規劃為 D: OPC-DATA，除非實機硬體紀錄有明確不同決策。
6. C: 與 D: 保持獨立，不使用 RAID 0、Spanned Volume 或 Dynamic Disk 合併。
7. 不使用 junction 把重要資料散到不同磁碟；以單一 Workspace 與明確 mount 為主。
8. 重灌後必須能透過手冊、Bootstrap、備份與 Recovery Package 重建。
9. 所有「完成」都需要指令輸出、報告、checksum 或實際 restore 證據。
10. Phase 2 不得在 Phase 1 實機 PASS 前開始規劃。

## Phase 1 封版文件

```text
11-Final/03-Full-System-Acceptance.md
11-Final/04-Completion-Record.md
11-Final/05-Phase-1-Release-and-Phase-2-Handoff.md
```

## Phase 2 邊界

Phase 2 的來源與排除規則只在正式交接文件維護，不在入口頁重複定義。

## 目前狀態

```text
Phase 1 Handbook: COMPLETE
Phase 1 CI Audit: PASS
Phase 1 Bare-Metal Validation: PENDING
Phase 1 Release: NOT YET SIGNED
Phase 2 Planning: BLOCKED
```

下一步只有：

```text
依 Master Index 完成真實重灌
→ 保存 evidence
→ 修正現場差異
→ Full-System Acceptance PASS
→ Phase 1 Release
```
