# ADR-0002：不以真正合併磁碟解決 Agent 路徑問題

## Status

Accepted

## Context

使用者有兩顆 M.2 SSD，希望避免 Agent 忘記另一顆磁碟存在。

## Considered Options

1. Dynamic Disk Spanned Volume
2. Storage Spaces Simple Pool
3. RAID 0
4. 保留兩顆磁碟，但建立單一 Workspace

## Decision

採用方案 4：

```text
保留兩顆實體 SSD
對 AI / Agent / 使用者暴露單一 D:\OPC Workspace
```

## Reason

真正合併磁碟會提高資料風險與救援難度，但 Agent 路徑混亂的根本問題是「工作根目錄不固定」，不是「磁碟數量太多」。

因此以單一 Workspace 解決路徑問題，比合併磁碟更安全。

## Consequences

- Agent prompt 永遠使用 `D:\OPC`。
- 大型資料夾未來可用 junction / mount point 分流。
- 磁碟仍保持獨立，救援較容易。
