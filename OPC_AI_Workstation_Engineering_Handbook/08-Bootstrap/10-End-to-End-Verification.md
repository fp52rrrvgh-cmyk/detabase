# 08-Bootstrap / 10 端對端驗收

## 目標

驗證一台剛完成 Windows 11 全新安裝的電腦，能依 Bootstrap 文件與腳本建成可工作的 OPC AI Workstation。

## 驗收路徑

```text
Clean Windows
→ Windows baseline
→ D:\OPC workspace
→ Developer tools
→ WSL2 Ubuntu
→ Docker Desktop
→ PostgreSQL + Redis
→ Runtime services
→ Secrets handoff
→ Doctor
→ Test Objective
```

## 測試一：全新安裝

- Windows 11 可正常啟動。
- Secure Boot、TPM、虛擬化正常。
- D: 為 `OPC-DATA` NTFS volume。
- `D:\OPC` 標準目錄與 marker 已建立。

## 測試二：基礎工具

```powershell
git --version
gh --version
code --version
pwsh --version
wsl --status
docker version
```

所有工具都必須能顯示版本。

## 測試三：Runtime Services

- PostgreSQL healthy。
- Redis PING 成功。
- Compose stack 正常。
- Database schema 版本正確。
- 重建 container 後資料仍存在。

## 測試四：Bootstrap 重跑

重新執行相同 Manifest。

預期：

- 已安裝套件跳過。
- 已存在目錄保留。
- WSL distribution 不重建。
- Named volume 不刪除。
- Doctor 結果維持一致。

## 測試五：中斷恢復

在需要重開機或刻意停止的步驟中中斷，之後以 `-Resume` 繼續。

預期：

- 從安全 checkpoint 恢復。
- 已完成步驟不重做。
- State 與 Manifest version 一致。

## 測試六：失敗處理

故意製造一個無效 package id 或被占用的 port。

預期：

- Bootstrap 停止。
- 產生 failure report。
- 不執行後續 phase。
- 修正後可安全 Resume。

## 測試七：第一個 Objective

建立一個低風險測試 Objective，例如：

```text
讀取指定 repository README，產生摘要，保存 artifact 與 evidence，不修改 repository。
```

驗收：

- Objective、Task、Attempt、Tool Call 可追蹤。
- Worker 在隔離 session 執行。
- Artifact 有 checksum。
- Reviewer 能通過或退回。
- Morning Report 能顯示結果。

## 最終通過條件

- 全新安裝可依手冊建成工作站。
- Bootstrap 可重跑、可中斷、可恢復。
- Doctor 無 FAIL。
- Runtime 可完成一個具 Evidence 的測試 Objective。
- Secrets、資料與權限邊界符合政策。
