# 03-Windows / 13 Dev Drive 決策

## 目標

評估是否將 OPC Workspace 建立在 Windows Dev Drive / ReFS，而不是一般 NTFS 資料碟。

## 白話說明

Dev Drive 是 Windows 為開發工作負載設計的磁碟區，通常搭配 ReFS。它主要針對大量小檔案、原始碼、套件快取與建置工作。

## 潛在優點

- 對部分開發檔案工作負載有最佳化。
- 可與 Microsoft Defender Performance Mode 搭配。
- 適合 source code、package cache、build output。

## 限制與風險

- ReFS 與 NTFS 功能不完全相同。
- 某些工具、遊戲、備份軟體或舊程式可能預期 NTFS。
- 不適合作為 Windows 系統磁碟。
- 不能因為名稱是 Dev Drive 就直接把所有資料搬進去。

## OPC 現階段決策

Phase 1 預設採用：

```text
D:\OPC on NTFS
```

原因：

- 小白維護成本較低。
- 與遊戲、備份、一般工具相容性較高。
- 重灌與救援流程較單純。
- 目前尚未有實測證據證明 Dev Drive 對 OPC 工作負載有足夠收益。

## 未來試驗方式

可建立獨立測試 Dev Drive，放入：

- npm / pnpm cache
- Python package cache
- build output
- disposable sandbox

並比較：

- Git checkout 時間
- npm install / pnpm install 時間
- Python venv 建立時間
- Defender 掃描影響
- 備份與還原難度

## 不放入 Dev Drive 的資料

未完成驗證前，不放：

- 唯一副本的專案
- secrets
- production database
- 個人文件
- 遊戲庫
- 無備份的大型模型

## 驗收條件

只有在實測顯示明顯收益，且備份、還原、工具相容性通過後，才建立新的 ADR 採用 Dev Drive。
