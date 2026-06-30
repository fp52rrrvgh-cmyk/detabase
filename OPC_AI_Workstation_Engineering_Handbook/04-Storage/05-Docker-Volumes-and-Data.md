# 04-Storage / 05 Docker Volumes 與持久化資料

## 目標

確保 PostgreSQL、Redis 與其他 Docker 服務在 container 刪除重建後，資料仍然存在，而且能備份與還原。

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

## Step 1：啟動前看 Compose 設定

```powershell
cd D:\OPC\runtime\<service>
docker compose config
```

確認：

- 資料庫使用 named volume。
- Windows 路徑拼字正確。
- 沒有把 secrets 直接寫入 compose 檔。

## Step 2：啟動並建立測試資料

```powershell
docker compose up -d
docker compose ps
docker volume ls
```

在資料庫建立一筆可辨識的測試資料。

## Step 3：測試 container 重建

```powershell
docker compose down
docker compose up -d
```

注意：不要加 `-v`。`docker compose down -v` 會刪除 named volume。

重新連線後，測試資料必須仍存在。

## Step 4：備份 PostgreSQL

正式 PostgreSQL 優先使用 `pg_dump`，不要只備份 volume 檔案。

範例：

```powershell
New-Item -ItemType Directory -Path D:\OPC\backups\database -Force | Out-Null
docker compose exec -T postgres pg_dump -U <DB_USER> -d <DB_NAME> > D:\OPC\backups\database\postgres-backup.sql
```

`postgres`、`<DB_USER>`、`<DB_NAME>` 必須換成實際值。

確認檔案不是空的：

```powershell
Get-Item D:\OPC\backups\database\postgres-backup.sql
Get-FileHash D:\OPC\backups\database\postgres-backup.sql -Algorithm SHA256
```

## Step 5：測試還原

不要覆蓋正式資料庫。建立測試資料庫後還原：

```powershell
docker compose exec -T postgres createdb -U <DB_USER> <TEST_DB_NAME>
Get-Content D:\OPC\backups\database\postgres-backup.sql -Raw |
  docker compose exec -T postgres psql -U <DB_USER> -d <TEST_DB_NAME>
```

確認測試資料存在後，才算備份成功。

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
- 只備份 volume，不做資料庫 dump 與還原測試。

## 完成條件

- [ ] 資料庫使用 named volume。
- [ ] Container 重建後測試資料仍存在。
- [ ] PostgreSQL dump 已建立。
- [ ] Dump checksum 已記錄。
- [ ] Dump 已還原到測試資料庫並驗證。
- [ ] 外部備份中也有這份 dump。
