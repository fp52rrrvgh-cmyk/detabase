# 工程手冊進度

## 章節覆蓋率：100%

原定 10 批次章節、架構、操作程序、範本與基礎腳本已建立。

## 技術稽核進度：10%

目前正在 `handbook-audit-v2` 分支執行第二階段稽核。此階段會檢查官方來源、版本相容性、命令語法、破壞性風險、回復程序、跨章節一致性與腳本可執行性。

> **目前不可將本手冊視為已核准的重灌執行版本。** 在 `AUDIT/00-Audit-Status.md` 的 Critical Gates 全部通過以前，不得依手冊直接刪除磁碟分割區或重設 Docker / WSL2 資料。

| 稽核工作流 | 狀態 |
|---|---|
| Windows installation and activation | 進行中 |
| Hardware and BIOS | 待稽核 |
| Storage and BitLocker | 進行中 |
| WSL2 | 進行中 |
| Docker Desktop and Compose | 進行中 |
| Development toolchain | 待稽核 |
| AI runtime architecture | 待稽核 |
| Bootstrap scripts | 待稽核 |
| Operations and security | 待稽核 |
| Disaster recovery rehearsal | 待稽核 |
| Cross-document consistency | 待稽核 |

## 已完成的稽核工作

- 建立技術稽核分支與合併門檻。
- 建立官方一手文件來源登錄表。
- 將 Windows 全新安裝章節改為 Gate-based destructive procedure。
- 補上外部備份與實際還原測試要求。
- 補上 BitLocker recovery key 強制檢查。
- 補上兩顆 SSD 以型號、序號與容量正面識別的流程。
- 補上 Windows 11 25H2 / 26H1 適用範圍提醒。

## 文件完成定義

```text
章節覆蓋完整
+ 官方來源已審核
+ 版本相容性已確認
+ 指令與腳本已測試
+ 破壞性步驟有防呆與回復
+ Clean-environment rehearsal 通過
+ Owner review 通過
= Reinstall-Approved Handbook
```
