# 03-Windows / 03 Windows Update 策略

## 目標

讓 Windows 維持安全與驅動相容，同時避免更新在 Agent 長時間任務中途強制重開機。

## 採用原則

- 不永久停用 Windows Update。
- 不使用 Registry 或第三方工具破壞更新服務。
- 設定 Active Hours，避開夜間 Agent 工作時段。
- 大型功能更新先觀察，再安排人工維護窗口。

## 建議設定

1. 開啟「設定 → Windows Update」。
2. 完成所有安全性與累積更新。
3. 設定使用時間，避開預計讓 Agent 工作的夜間。
4. 開啟重新啟動通知。
5. 驅動更新出現異常時，先查版本，不要反覆安裝。

## 維護窗口

建議每週安排一次人工維護：

```text
暫停 Agent
→ 備份重要狀態
→ Windows Update
→ 重開機
→ opc doctor
→ 恢復服務
```

## 驗收

```powershell
Get-HotFix | Sort-Object InstalledOn -Descending | Select-Object -First 10
```

並確認 Windows Update 畫面沒有等待重新啟動。

## 禁止事項

- 停用 Windows Update service
- 刪除系統更新元件
- 使用不明工具封鎖 Microsoft 更新網域
- 在資料庫 migration 或長時間任務執行中重開機
