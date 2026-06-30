# 04-Storage / 06 備份策略

## 目標

確保重灌、SSD 故障、誤刪、Agent 失控或 Docker volume 損壞時，能恢復重要資料。

## 3-2-1 原則

重要資料至少：

- 3 份副本
- 2 種不同媒介
- 1 份異地或雲端

## OPC 資料分類

### 必須備份

- Git repositories 尚未 push 的 commit
- ADR、Runbook、工程手冊
- Secrets reference 與 vault recovery 資訊
- Production database dump
- 使用者原始資料
- 關鍵設定與 Bootstrap scripts

### 可重建，不必長期備份

- node_modules
- Python `.venv`
- Docker image
- 套件快取
- 可重新下載的模型
- 暫存 sandbox
- 一般 log

### 視成本備份

- 大型模型
- Research corpus
- 測試 artifact
- Docker named volume snapshot

## 備份層級

### GitHub

保存程式碼、文件、ADR、腳本與非敏感設定。

### 外接硬碟

保存完整專案快照、資料庫 dump、重要 artifact。

### 雲端或異地

保存無法重新取得的資料與加密後的恢復包。

## 建議目錄

```text
D:\OPC\backups
├─ database\
├─ docker\
├─ config\
├─ workspace\
└─ recovery\
```

`D:\OPC\backups` 只是一份本機暫存，不算真正異地備份。

## 備份流程

```text
停止寫入
→ 建立資料庫 dump
→ 匯出必要設定
→ 建立 checksum
→ 複製到外接或雲端
→ 驗證可讀
→ 記錄日期與版本
```

## PowerShell checksum

```powershell
Get-FileHash D:\OPC\backups\database\backup.sql -Algorithm SHA256
```

## 驗收

備份完成不等於可恢復。至少每月執行一次測試還原：

- Clone repository
- 還原 database 到測試環境
- 驗證設定檔
- 驗證 secrets 可由 vault 重新取得
- 驗證重要文件可開啟

## 禁止事項

- 只有同一顆 SSD 上的備份
- 只同步、不保留版本
- 從未測試還原
- 把 plaintext secrets 上傳到雲端
- 依賴單一 Git repository 保存資料庫內容
