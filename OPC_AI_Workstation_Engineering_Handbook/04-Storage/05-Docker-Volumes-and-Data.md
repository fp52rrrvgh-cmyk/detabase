# 04-Storage / 05 Docker Volumes 與持久化資料

## 目標

確保 PostgreSQL、Redis 與其他 Docker 服務在 container 刪除重建後，資料仍然存在，而且 PostgreSQL 備份真的可以還原。

## 先理解兩件事

- Container 可以刪掉重建。
- 資料不應跟著 container 消失。

資料必須放在 named volume 或明確的 bind mount。

## OPC 固定決策

| 資料類型 | 使用方式 |
|---|---|
| PostgreSQL / Redis 資料 | Named Volume |
| 程式碼與設定 | Bind Mount |
| Artifact | Bind Mount 到 `D:\OPC\artifacts` |
| Secrets | 不進 image、不進 Git |
| Compose 檔 | `D:\OPC\runtime\<service>` |

資料庫資料目錄不要直接 bind mount 到 Windows NTFS 路徑，避免權限與檔案系統問題。

## Named Volume 範例

```yaml
services:
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Bind Mount 範例

```yaml
services:
  app:
    volumes:
      - D:/OPC/projects/example:/workspace
```

## Step 1：啟動前驗證 Compose

```powershell
Set-Location D:\OPC\runtime\opc-core
docker compose config
```

確認：

- PostgreSQL 與 Redis 使用 named volume。
- Windows 路徑拼字正確。
- 沒有把 secrets 直接寫入 compose 檔。
- PostgreSQL 與 Redis 都有 healthcheck。

## Step 2：啟動並確認健康狀態

```powershell
docker compose -p opc-core up -d
docker compose -p opc-core ps
docker volume ls
```

通過條件：

- PostgreSQL 顯示 running / healthy。
- Redis 顯示 running / healthy。
- Named volume 已建立。

## Step 3：建立可辨識的測試資料

PostgreSQL：

```powershell
docker compose -p opc-core exec -T postgres `
  psql -U opc -d opc -c "CREATE TABLE IF NOT EXISTS recovery_probe(id integer primary key, value text not null); INSERT INTO recovery_probe(id,value) VALUES (1,'restore-me') ON CONFLICT (id) DO UPDATE SET value='restore-me';"
```

查詢：

```powershell
docker compose -p opc-core exec -T postgres `
  psql -U opc -d opc -c "SELECT * FROM recovery_probe;"
```

Redis：

```powershell
docker compose -p opc-core exec -T redis redis-cli SET opc:recovery-probe restore-me
docker compose -p opc-core exec -T redis redis-cli GET opc:recovery-probe
```

## Step 4：測試 container 重建

```powershell
docker compose -p opc-core down
docker compose -p opc-core up -d
```

不要加 `-v`。`docker compose down -v` 會刪除 named volume。

重新查詢 PostgreSQL 與 Redis 測試資料。兩者都必須仍存在。

## Step 5：建立 PostgreSQL custom-format 備份

正式演練優先使用 custom format，方便用 `pg_restore` 驗證與選擇性還原。

```powershell
$BackupDir = 'D:\OPC\backups\database'
$BackupFile = Join-Path $BackupDir 'opc-postgres.dump'
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

docker compose -p opc-core exec -T postgres `
  pg_dump -U opc -d opc -Fc > $BackupFile
```

確認檔案：

```powershell
Get-Item $BackupFile
Get-FileHash $BackupFile -Algorithm SHA256 |
  Tee-Object -FilePath (Join-Path $BackupDir 'opc-postgres.sha256.txt')
```

停止條件：

- 備份檔不存在。
- 備份檔為 0 bytes。
- `pg_dump` 回傳錯誤。

## Step 6：檢查備份內容

不要只看檔案大小。先列出 archive 內容：

```powershell
Get-Content $BackupFile -AsByteStream -Raw |
  docker compose -p opc-core exec -T postgres pg_restore -l
```

輸出中應看得到 `recovery_probe` 與必要 schema 物件。

## Step 7：還原到隔離測試資料庫

不要覆蓋正式 `opc` database。

先移除舊測試資料庫並重建：

```powershell
docker compose -p opc-core exec -T postgres `
  psql -U opc -d postgres -c "DROP DATABASE IF EXISTS opc_restore_test;"

docker compose -p opc-core exec -T postgres `
  createdb -U opc opc_restore_test
```

將 dump 傳入 `pg_restore`：

```powershell
Get-Content $BackupFile -AsByteStream -Raw |
  docker compose -p opc-core exec -T postgres `
  pg_restore -U opc -d opc_restore_test --clean --if-exists --no-owner
```

若目標資料庫剛建立且完全空白，`--clean` 不是必要；保留此參數是為了讓重跑演練可清理既有物件。

## Step 8：驗證還原結果

```powershell
docker compose -p opc-core exec -T postgres `
  psql -U opc -d opc_restore_test -c "SELECT * FROM recovery_probe;"
```

必須看到：

```text
1 | restore-me
```

再確認基本物件數量：

```powershell
docker compose -p opc-core exec -T postgres `
  psql -U opc -d opc_restore_test -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"
```

只有查詢成功，才算備份通過。

## Step 9：清理測試資料庫

確認驗收證據已保存後：

```powershell
docker compose -p opc-core exec -T postgres `
  psql -U opc -d postgres -c "DROP DATABASE IF EXISTS opc_restore_test;"
```

不要刪除正式 database，也不要刪除 named volume。

## Step 10：複製到外部備份

`D:\OPC\backups` 與 production 資料位於同一台電腦，不算完整備份。

至少把以下檔案複製到外部位置：

- `opc-postgres.dump`
- `opc-postgres.sha256.txt`
- 不含 secrets 的演練紀錄

在外部媒介重新計算 SHA-256，必須與原始值一致。

## 查詢 Volume

```powershell
docker volume ls
docker volume inspect <VOLUME_NAME>
docker system df
```

## 禁止事項

- `docker compose down -v` 用在有重要資料的 stack。
- `docker system prune --volumes`。
- 未備份就 Factory Reset Docker Desktop。
- 把 production database 唯一副本放在本機 volume。
- 把 secrets bake 進 image。
- 只備份 volume，不做 database dump 與還原測試。
- 直接把測試 dump 還原覆蓋正式 database。

## 完成條件

- [ ] PostgreSQL 與 Redis 使用 named volume。
- [ ] Container 重建後測試資料仍存在。
- [ ] PostgreSQL custom-format dump 已建立。
- [ ] Dump checksum 已記錄。
- [ ] `pg_restore -l` 可讀取 archive。
- [ ] Dump 已還原到 `opc_restore_test`。
- [ ] `recovery_probe` 查詢成功。
- [ ] 外部備份中也有 dump 與 checksum。
