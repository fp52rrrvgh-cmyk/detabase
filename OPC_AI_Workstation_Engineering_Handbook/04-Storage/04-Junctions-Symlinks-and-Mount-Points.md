# 04-Storage / 04 Junction、Symbolic Link 與 Mount Point

## 目標

在不改變 Agent 路徑的前提下，把大型資料夾分流到其他實體磁碟。

## 白話說明

可以把它們理解成「門牌不變，但房間搬家」。Agent 仍然看到：

```text
D:\OPC\models
```

但實際資料可以存放在另一顆磁碟。

## 三種機制

### Junction

適合 Windows 本機資料夾重新導向，使用簡單、相容性高。

```powershell
New-Item -ItemType Junction -Path D:\OPC\models -Target E:\OPC-MODELS
```

### Symbolic Link

可連結檔案或資料夾，較彈性，但部分程式與權限環境可能有額外限制。

```powershell
New-Item -ItemType SymbolicLink -Path D:\OPC\models -Target E:\OPC-MODELS
```

### Volume Mount Point

把整個磁碟區掛到某個 NTFS 資料夾，適合不想顯示額外磁碟代號的情境，但維護難度較高。

## OPC Phase 1 決策

優先順序：

1. 先直接使用 `D:\OPC`。
2. 容量不足時，針對 `models`、`artifacts`、`backups` 使用 Junction。
3. 不在初始建置使用整碟 Mount Point。
4. 不對 Git repository 根目錄使用 Junction，除非已驗證 Git、Docker 與備份工具行為。

## 建立 Junction 前的安全步驟

1. 暫停會寫入該資料夾的 Agent。
2. 備份原資料。
3. 將資料移到目標位置。
4. 確認原路徑已不存在或為空。
5. 建立 Junction。
6. 測試讀寫。

## 查詢連結

```powershell
Get-Item D:\OPC\models | Format-List FullName,LinkType,Target
```

## 移除 Junction

```powershell
Remove-Item D:\OPC\models
```

這只移除連結，不應刪除目標資料；執行前仍必須再次確認 `LinkType` 與 `Target`。

## 風險

- 備份工具可能跟隨連結，造成重複備份。
- Agent 可能把 Junction 當一般資料夾遞迴掃描。
- 目標磁碟未掛載時，原路徑失效。
- 不正確的刪除命令可能傷及目標資料。

## 驗收

- 原路徑可正常讀寫。
- 重新開機後連結仍存在。
- Git、Docker、備份工具不出現遞迴或權限錯誤。
