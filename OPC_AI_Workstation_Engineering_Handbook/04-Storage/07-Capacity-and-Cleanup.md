# 04-Storage / 07 容量監控與清理

## 目標

避免模型、Docker image、volume、log、artifact 與套件 cache 吃滿 SSD，造成 Windows、WSL2 或資料庫異常。

## 容量警戒線

- 可用空間低於 20%：警告，開始檢查。
- 低於 10%：停止大型下載、模型與低優先工作。
- 低於 5%：停止大量寫入、database migration 與 Agent。

## Step 1：查看 C 與 D 槽

```powershell
Get-Volume -DriveLetter C,D |
  Select-Object DriveLetter,FileSystemLabel,HealthStatus,Size,SizeRemaining,@{Name='FreePercent';Expression={[math]::Round(($_.SizeRemaining/$_.Size)*100,1)}}
```

若 HealthStatus 不是 Healthy，先處理磁碟問題，不要開始清理。

## Step 2：查看 D:\OPC 哪裡最大

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

大型目錄掃描可能需要時間。不要因為視窗暫時沒輸出就強制中止。

## Step 3：查看 Docker 用量

```powershell
docker system df
docker image ls
docker container ls -a
docker volume ls
```

先辨識，再清理。

## Step 4：只清理可重建項目

可考慮：

```powershell
docker image prune
docker container prune
docker builder prune
```

每個指令都會要求確認。先閱讀清單。

禁止直接使用：

```text
docker system prune --all --volumes
```

因為它可能刪除仍有重要資料的 volume。

## 可以清理

- 超過保留期的 debug log
- 可重新下載的 cache
- 已完成且 evidence 已保存的 sandbox
- 已 push、可重建的 build artifact
- 確認未被使用的 Docker image 與停止容器

## 不可自動清理

- 未 push 的 repository
- 未備份 database volume
- 唯一一份 artifact
- 使用中的模型
- Secrets
- Recovery 資訊
- 來源不明的資料夾

## Log 保留

- Debug log：7–14 天
- 任務執行 log：30 天
- Evidence / audit log：依專案長期保存
- Security log：至少 90 天或依容量調整

## 清理紀錄

每次記錄：

```text
日期：
清理前空間：
清理項目：
執行指令：
清理後空間：
是否影響服務：
```

## 完成條件

- [ ] C 與 D 都高於安全空間。
- [ ] Docker 用量已盤點。
- [ ] 沒有未知 database volume 被刪除。
- [ ] 清理前有人工確認。
- [ ] 清理後 WSL2、Docker 與主要服務仍正常。

## 停止條件

- 磁碟 HealthStatus 異常。
- 不知道 volume 用途。
- 備份尚未完成。
- 清理後 Docker stack 無法啟動。
