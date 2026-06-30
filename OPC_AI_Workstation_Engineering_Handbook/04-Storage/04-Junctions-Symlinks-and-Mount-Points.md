# 04-Storage / 04 Junction、Symbolic Link 與 Mount Point

## 目標

只有在 D 槽容量真的不足時，才把特定大型資料夾搬到其他磁碟，同時維持 `D:\OPC\...` 路徑不變。

## Phase 1 預設決策

初次建置時：

```text
不要建立 Junction
不要建立 Symbolic Link
不要建立 Mount Point
```

先直接使用 `D:\OPC`。只有 `models`、`artifacts` 或 `backups` 容量不足時，才考慮 Junction。

## 白話說明

Junction 可理解成：門牌仍是 `D:\OPC\models`，但實際資料搬到 `E:\OPC-MODELS`。

## 什麼情況才需要

- D 槽低於安全空間。
- 另一顆磁碟是穩定的本機 NTFS 磁碟。
- 備份工具已測試不會遞迴或重複備份。
- 寫入該資料夾的服務可以完整停止。

## Step 1：先停止寫入

停止會使用目標資料夾的 Agent、模型服務與同步工具。

確認沒有程式開啟該資料夾。

## Step 2：建立目標資料夾

範例：

```powershell
New-Item -ItemType Directory -Path 'E:\OPC-MODELS' -Force
```

不要直接照抄 E:，先確認實際磁碟。

## Step 3：複製資料，不要先刪原資料

```powershell
robocopy 'D:\OPC\models' 'E:\OPC-MODELS' /E /COPY:DAT /DCOPY:DAT /R:2 /W:2
```

`robocopy` 回傳碼 0 到 7 通常不一定是失敗；先查看摘要與檔案數量。

確認兩邊內容後，再把原目錄改名：

```powershell
Rename-Item 'D:\OPC\models' 'models.old'
```

## Step 4：建立 Junction

```powershell
New-Item -ItemType Junction -Path 'D:\OPC\models' -Target 'E:\OPC-MODELS'
```

## Step 5：驗證

```powershell
Get-Item 'D:\OPC\models' | Format-List FullName,LinkType,Target
Set-Content 'D:\OPC\models\junction-test.txt' 'ok'
Get-Content 'E:\OPC-MODELS\junction-test.txt'
```

應看到 `LinkType : Junction`，且測試檔可從兩個路徑讀到。

重新開機後再測一次。

## Step 6：確認備份工具

確認備份工具：

- 不會無限遞迴。
- 不會把同一批資料備份兩次。
- 目標磁碟未掛載時會明確報錯。

## 回復原狀

先確認連結：

```powershell
Get-Item 'D:\OPC\models' | Format-List FullName,LinkType,Target
```

只移除 Junction：

```powershell
Remove-Item 'D:\OPC\models'
```

再把舊目錄改回：

```powershell
Rename-Item 'D:\OPC\models.old' 'models'
```

不要使用遞迴刪除參數處理 Junction。

## 禁止事項

- 初次重灌就建立 Junction。
- 對 `projects` 根目錄建立 Junction。
- 目標是網路磁碟或不穩定 USB。
- 原資料尚未核對就刪除。
- 不確認 LinkType 就執行 Remove-Item。
- 使用整碟 Mount Point 增加維護複雜度。

## 完成條件

- [ ] 原路徑可正常讀寫。
- [ ] LinkType 與 Target 正確。
- [ ] 重新開機後仍可使用。
- [ ] 備份工具沒有遞迴或重複備份。
- [ ] `models.old` 保留到完整驗證後才刪除。
