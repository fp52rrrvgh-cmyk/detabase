# 04-Storage / 07 容量監控與清理

## 目標

避免模型、Docker image、volume、log、artifact 與套件快取逐步吃滿 SSD，導致 Windows、WSL2 或資料庫異常。

## 容量警戒線

建議：

- 低於 20% 可用空間：提出警告。
- 低於 10%：停止低優先級下載與模型任務。
- 低於 5%：停止會大量寫入的 Agent 與資料庫 migration。

## 查詢磁碟空間

```powershell
Get-PSDrive -PSProvider FileSystem |
  Select-Object Name,Used,Free,@{Name='FreeGB';Expression={[math]::Round($_.Free/1GB,2)}}
```

## 找出大型資料夾

```powershell
Get-ChildItem D:\OPC -Directory | ForEach-Object {
  $size = (Get-ChildItem $_.FullName -Recurse -File -ErrorAction SilentlyContinue |
    Measure-Object Length -Sum).Sum
  [pscustomobject]@{
    Path = $_.FullName
    SizeGB = [math]::Round($size / 1GB, 2)
  }
} | Sort-Object SizeGB -Descending
```

## Docker 清理

先檢查：

```powershell
docker system df
docker image ls
docker volume ls
```

只清理明確不再使用的資源：

```powershell
docker image prune
docker container prune
docker builder prune
```

不要在未確認前使用：

```text
docker system prune --all --volumes
```

## 可自動清理

- 超過保留期的 log
- 可重新下載的 cache
- 已完成且已保存 evidence 的 sandbox
- 已 push 的暫時 build artifact

## 不可自動清理

- 未 push 的 repository
- 未備份 database volume
- 使用中的本機模型
- 唯一一份 artifact
- secrets 與 recovery 資訊

## Log 保留策略

建議：

- 一般 debug log：7–14 天
- 任務 execution log：30 天
- Evidence 與 audit log：依專案長期保存
- Security log：至少 90 天或依容量調整

## 驗收

- C 與 D 槽都保有安全空間。
- Docker 不存在大量無主 image / volume。
- 清理腳本有 dry-run 模式。
- 清理行為會留下紀錄。
