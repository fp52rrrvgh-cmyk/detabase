# 04-Storage / 06 備份策略

## 目標

重灌、SSD 故障、誤刪、Agent 失控或 Docker volume 損壞時，能把重要資料恢復回來。

## 核心規則

`D:\OPC\backups` 只是本機暫存。它和正式資料位於同一顆 SSD，不能算真正備份。

重要資料至少遵守 3-2-1：

- 3 份副本
- 2 種不同媒介
- 1 份異地或雲端

## Step 1：先分類

### 必須備份

- 尚未 push 的 Git commit
- 工程手冊、ADR、Runbook 與 scripts
- Production database dump
- 使用者原始資料
- 關鍵設定
- Vault recovery 資訊與 secret reference
- 無法重新取得的 artifact

### 可重建

- `node_modules`
- Python `.venv`
- Docker image
- 套件 cache
- 可重新下載的模型
- Sandbox
- 一般 debug log

## Step 2：建立本機暫存結構

```powershell
$Dirs = @('database','docker','config','workspace','recovery')
$Dirs | ForEach-Object {
  New-Item -ItemType Directory -Path (Join-Path 'D:\OPC\backups' $_) -Force | Out-Null
}
```

## Step 3：確認 Git 已推送

在每個重要 repository 執行：

```powershell
git status
git log --oneline --decorate -5
git remote -v
git push
```

`git status` 應顯示 working tree clean；需要保留的 commit 應已存在遠端。

## Step 4：建立資料庫 dump

依 `04-Storage/05-Docker-Volumes-and-Data.md` 建立 PostgreSQL dump。

建立 checksum：

```powershell
Get-FileHash D:\OPC\backups\database\postgres-backup.sql -Algorithm SHA256 |
  Out-File D:\OPC\backups\database\postgres-backup.sha256.txt
```

## Step 5：複製到外部位置

可使用外接硬碟、NAS 或加密雲端。至少一份不能位於同一台電腦內。

複製後重新計算 SHA-256，比對兩邊是否一致。

## Step 6：抽樣還原

每次重灌前至少完成：

1. 從遠端 clone 一個重要 repository。
2. 從外部備份複製一份文件並打開。
3. 將 database dump 還原到測試資料庫。
4. 確認 recovery package 可讀。
5. 確認 BitLocker recovery key 可取得。

只做備份、不測還原，視同沒有備份。

## 重灌前必填

| 項目 | 保存位置 | 已驗證 |
|---|---|---|
| Git repositories |  | 是 / 否 |
| Database dump |  | 是 / 否 |
| 原始資料 |  | 是 / 否 |
| Recovery package |  | 是 / 否 |
| BitLocker recovery key |  | 是 / 否 |

全部為「是」才能開始刪除 Windows 分割區。

## 禁止事項

- 只有同一顆 SSD 上的備份。
- 只同步，不保留歷史版本。
- 從未測試還原。
- 上傳 plaintext secrets。
- 把資料庫內容提交 Git。
- 把可重建 cache 當成重灌前優先備份，反而漏掉原始資料。

## 完成條件

- [ ] 重要 Git commit 已 push。
- [ ] Database dump 已建立並驗證 checksum。
- [ ] 至少一份外部副本。
- [ ] 已完成 repository、文件與 database 抽樣還原。
- [ ] BitLocker recovery key 可實際取得。
