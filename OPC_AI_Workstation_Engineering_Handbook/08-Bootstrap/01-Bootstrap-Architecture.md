# 08-Bootstrap / 01 Bootstrap 架構

## 目標

讓一台剛完成 Windows 11 全新安裝的電腦，可以依固定順序被建置成 OPC AI Workstation，而且每一步都可重跑、可驗證、可中止、可回復。

## Bootstrap 原則

- **可重跑**：重複執行不應破壞已完成環境。
- **可分段**：每一階段都能單獨執行與驗收。
- **可觀察**：所有步驟輸出 log、結果與失敗原因。
- **最小權限**：只有必要步驟使用系統管理員權限。
- **不藏 secrets**：Bootstrap 只建立 secret 交接點，不硬編碼真值。
- **失敗即停止**：不在前一步失敗後繼續堆疊未知狀態。

## 階段劃分

```text
Phase 0  Preflight
Phase 1  Windows baseline
Phase 2  Storage and workspace
Phase 3  Developer tools
Phase 4  WSL2 and Ubuntu
Phase 5  Docker Desktop
Phase 6  Runtime services
Phase 7  Secrets handoff
Phase 8  Doctor and verification
Phase 9  Final report
```

## 執行入口

主入口：

```text
D:\OPC\tools\bootstrap\bootstrap.ps1
```

子腳本：

```text
D:\OPC\tools\bootstrap\steps\
```

每個 step 應接受統一參數：

```powershell
-ManifestPath
-LogPath
-DryRun
-Force
-Resume
```

## 狀態保存

Bootstrap state：

```text
D:\OPC\runtime\bootstrap\state.json
```

至少記錄：

- manifest version
- current phase
- completed steps
- failed step
- reboot required
- started_at
- updated_at
- machine fingerprint

## 重新開機處理

涉及 Windows feature、driver、WSL2、Docker Desktop 的步驟可能需要重開機。腳本必須：

1. 保存 checkpoint。
2. 標記 `reboot_required=true`。
3. 停止後續施工。
4. 重開後以 `-Resume` 從下一個安全步驟繼續。

## 通過條件

- 任一 phase 可單獨執行。
- 已完成步驟重跑時會安全跳過或驗證。
- 失敗後保留 log 與 state。
- 重開機後可繼續。
- 最終產生完整施工報告。