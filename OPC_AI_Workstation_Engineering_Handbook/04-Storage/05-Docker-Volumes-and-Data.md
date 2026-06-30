# 04-Storage / 05 Docker Volumes 與持久化資料

## 目標

確保 Redis、Postgres、Supabase local 與其他 Docker 服務的資料在 container 重建後仍存在，並能被備份與還原。

## Container 與資料的差別

Container 可以刪掉重建；資料不應跟著消失。持久化資料必須放在 Docker volume 或明確的 bind mount。

## 兩種主要方式

### Named Volume

```yaml
services:
  postgres:
    image: postgres:16
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

優點：

- Docker 管理生命週期。
- 權限與 Linux filesystem 相容性通常較穩定。
- 適合資料庫。

缺點：

- Windows 檔案總管不容易直接瀏覽。
- 備份需透過 Docker 指令或資料庫原生工具。

### Bind Mount

```yaml
services:
  app:
    volumes:
      - D:/OPC/projects/example:/workspace
```

優點：

- Windows 可直接看到檔案。
- 適合程式碼、設定與輸出成果。

缺點：

- 權限、效能與檔案監聽可能受 Windows / WSL2 邊界影響。
- 不一定適合資料庫資料目錄。

## OPC 決策

- 資料庫資料：Named Volume。
- 程式碼與文件：Bind Mount。
- Artifact：Bind Mount 到 `D:\OPC\artifacts`。
- Secrets：不直接寫入 image，不提交 Git。
- Compose 檔：放在 `D:\OPC\runtime\<service>`。

## 查詢 Volume

```powershell
docker volume ls
docker volume inspect <VOLUME_NAME>
```

## 備份 Named Volume 範例

```powershell
docker run --rm `
  -v postgres_data:/data `
  -v D:\OPC\backups\docker:/backup `
  alpine sh -c "tar czf /backup/postgres_data.tar.gz -C /data ."
```

對正式 PostgreSQL，優先使用 `pg_dump`，不要只依賴檔案層複製。

## 禁止事項

- 執行 `docker system prune --volumes` 前未確認資料
- 把 production database 唯一副本放在本機 volume
- 把資料庫資料目錄直接放在不穩定的網路磁碟
- 把 secrets bake 進 Docker image

## 驗收

1. 建立測試資料。
2. 刪除並重建 container。
3. 確認資料仍存在。
4. 執行備份。
5. 在測試 volume 還原並驗證。
