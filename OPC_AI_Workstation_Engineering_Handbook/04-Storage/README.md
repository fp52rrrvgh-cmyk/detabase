# 04 Storage Engineering：兩顆 M.2 SSD 與單一 Workspace

## 1. 問題

使用者有兩顆 M.2 SSD。直接分成 C 槽、D 槽會造成：

- Agent 忘記另一顆磁碟存在。
- 專案分散。
- 路徑提示變複雜。
- 重灌後恢復困難。

## 2. 不建議真正合併磁碟

目前不建議使用：

- Dynamic Disk Spanned Volume
- Storage Spaces simple pool
- RAID 0

原因：

- 任何一顆 SSD 出問題，資料風險變高。
- 重灌與救援複雜。
- 不能真正解決 Agent 路徑混亂。
- 遊戲與開發資料混在一起會更難備份。

## 3. 採用方案：單一 Workspace，而非單一實體磁碟

對外只暴露：

```text
D:\OPC
```

內部可以用資料夾策略分配空間：

```text
D:\OPC
  projects\
  knowledge\
  artifacts\
  runtime\
  logs\
  models\
  sandbox\
  backups\
```

若未來需要把 `models` 放到第二顆 SSD，可使用 NTFS junction 或 mount point，讓 Agent 仍看到 `D:\OPC\models`。

## 4. 建議磁碟規劃

### SSD 1

```text
C: Windows / Apps / Games launchers
```

### SSD 2

```text
D: OPC Workspace / Projects / AI data / Docker volumes / Models
```

## 5. 原則

- 不讓 Agent 直接操作整顆磁碟。
- Agent 只允許操作 `D:\OPC`。
- 不把 secrets 放在 repo。
- 大型模型、artifact、log 要可清理。

## 6. 驗收

重灌後建立：

```powershell
New-Item -ItemType Directory -Path D:\OPC
New-Item -ItemType Directory -Path D:\OPC\projects
New-Item -ItemType Directory -Path D:\OPC\knowledge
New-Item -ItemType Directory -Path D:\OPC\artifacts
New-Item -ItemType Directory -Path D:\OPC\runtime
New-Item -ItemType Directory -Path D:\OPC\logs
New-Item -ItemType Directory -Path D:\OPC\models
New-Item -ItemType Directory -Path D:\OPC\sandbox
New-Item -ItemType Directory -Path D:\OPC\backups
```
