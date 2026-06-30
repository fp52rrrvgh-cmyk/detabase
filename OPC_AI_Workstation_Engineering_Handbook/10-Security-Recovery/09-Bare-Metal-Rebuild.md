# 10-Security-Recovery / 09 Bare-Metal Rebuild

## 目標

在系統碟損壞、整機更換或完整重灌後，依文件、Manifest、Bootstrap 與備份重建 OPC AI Workstation。

## 必要 Recovery Package

不得只存在原電腦。至少包含：

- Windows 安裝來源與版本紀錄
- 主機板、網路與 GPU 型號
- Bootstrap repository URL
- Manifest 與版本
- BitLocker recovery key 保存位置
- Vault recovery 流程
- 外部備份位置
- PostgreSQL dump 與 checksum
- 關鍵 repository 清單
- 重新登入 GitHub 與外部服務的人工步驟

## 重建順序

```text
確認硬體與備份
→ 安裝 Windows 11
→ 完成驅動與更新
→ 建立 D: OPC-DATA
→ Clone Handbook / Bootstrap
→ 執行 Bootstrap phases
→ 完成 Secrets handoff
→ 還原 PostgreSQL 與必要 artifact
→ 啟動 Runtime
→ 執行 Doctor
→ 執行測試 Objective
```

## 資料碟仍存在時

- 不格式化 D:。
- 驗證 Volume Label 與 BitLocker 狀態。
- 掃描檔案系統與重要資料。
- Bootstrap 使用既有 `D:\OPC`，不得覆蓋專案。
- 還原 runtime 前先確認資料版本。

## 全新資料碟時

- 建立 GPT / NTFS / OPC-DATA。
- 從外部備份還原必要資料。
- 可重建的 cache、image、venv、node_modules 不必還原。
- 先還原 Git、database、config、evidence，再下載模型。

## 驗證順序

1. Secure Boot、TPM、BitLocker。
2. Git、GitHub CLI、PowerShell。
3. WSL2、Ubuntu、systemd。
4. Docker Desktop。
5. PostgreSQL、Redis、Runtime API。
6. Repository 與 artifact checksum。
7. Secrets scope。
8. Doctor 與端對端測試。

## 完成條件

- 工作站可在替代硬體上重建。
- 不依賴原系統碟。
- 關鍵資料符合 checksum。
- Runtime 可完成具 Evidence 的測試 Objective。
- 所有可能暴露的 credential 已輪替。