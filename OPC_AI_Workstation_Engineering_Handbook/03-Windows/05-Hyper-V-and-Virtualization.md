# 03-Windows / 05 Hyper-V、虛擬化與 WSL2 基礎

## 目標

保留 WSL2、Docker 與虛擬化能力，同時避免使用網路優化腳本把必要元件關掉。

## BIOS 必要設定

依 CPU 平台確認虛擬化已開啟：

- Intel：Intel Virtualization Technology / VT-x
- AMD：SVM Mode

主機板名稱可能不同，但核心目標是讓 Windows 能使用硬體虛擬化。

## Windows 必要功能

至少需要：

- Windows Subsystem for Linux
- Virtual Machine Platform

Docker Desktop 使用 WSL2 backend 時也依賴這些底層能力。

## 安裝與驗證

以系統管理員 PowerShell 執行：

```powershell
wsl --install
```

確認：

```powershell
systeminfo | Select-String "Hyper-V"
wsl --status
wsl -l -v
```

## 遊戲相容說明

硬體虛擬化與 VBS 可能對部分遊戲效能產生小幅影響，但不應為了追求理論最高幀數直接關閉所有虛擬化功能。OPC 的核心需求包含 WSL2 與 Docker，因此虛擬化屬於必要基礎。

若未來有特定遊戲反作弊衝突，應針對該遊戲驗證，而不是全域停用虛擬化。

## 常見錯誤

- BIOS 中 SVM / VT-x 關閉
- 執行 debloat script 後 Virtual Machine Platform 被停用
- 把 WSL1 誤認為 WSL2
- 為了遊戲優化關閉所有 Hyper-V 相關能力

## 驗收

- `wsl -l -v` 顯示 VERSION 2
- Docker Desktop 可啟動
- Windows 遊戲正常啟動
- 沒有因虛擬化設定造成藍畫面或反覆重啟
