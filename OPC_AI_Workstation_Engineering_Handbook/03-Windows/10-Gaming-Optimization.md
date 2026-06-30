# 03-Windows / 10 遊戲與 AI 工作站共存最佳化

## 目標

保留 Steam、Battle.net、EA App、Xbox App 與反作弊相容性，同時讓 WSL2、Docker 與 Agent runtime 可長時間運作。

## 採用策略

### 遊戲時

- 暫停非必要 Agent workflow。
- 暫停高 CPU / RAM / Disk 的 Docker workloads。
- 保留 WSL2 與 Docker 基礎能力，不必永久停用。
- 關閉不需要的瀏覽器分頁與本機模型。

### AI 工作時

- 避免同時啟動大型遊戲。
- 對 WSL2 設定合理資源上限。
- 讓低優先任務在系統壓力過高時自動暫停。

## Windows 設定

建議逐項測試：

- Game Mode：通常保持開啟。
- Hardware-accelerated GPU scheduling：依 GPU 驅動與遊戲實測。
- Variable Refresh Rate：顯示器支援時啟用。
- 遊戲 Overlay：只保留實際使用的工具。
- Startup Apps：停用不必要的自動啟動程式。

## 不建議的極端作法

- 為遊戲永久關閉 Hyper-V / WSL2。
- 關閉 Defender。
- 使用不明 Timer Resolution、HPET 或 Registry tweak。
- 將所有服務設為 Disabled。
- 使用會移除 Store、Xbox、WebView2 的精簡腳本。

## 遊戲模式操作流程

```text
opc pause-workers
→ 確認 Docker 高負載服務已停止
→ 啟動遊戲
→ 遊戲結束
→ opc doctor
→ opc resume-workers
```

上述指令會在後續 Operations 與 Bootstrap 章節實作。

## 量測方式

同一遊戲、同一場景、同一畫質設定比較：

- Average FPS
- 1% Low FPS
- CPU 使用率
- GPU 使用率
- RAM 使用量
- 背景磁碟 I/O

沒有量測證據，不將設定寫成永久規則。

## 驗收

- 主要遊戲與反作弊可正常啟動。
- 遊戲時 WSL2 / Docker 不造成明顯卡頓。
- 遊戲後 AI runtime 可恢復。
- 不需要反覆修改 BIOS 或 Windows 功能。
