讀取 CLAUDE.md 和 .claude/settings.json，然後輸出以下格式的邊界狀態報告。不要加多餘說明，直接輸出報告。

---

## 邊界狀態快照

### 當前優先任務
從 CLAUDE.md「當前優先」區塊讀取，逐條列出。

### 本次作業允許
從 .claude/settings.json permissions.allow 整理，分類顯示：
- **建置**：npm 相關
- **本地腳本**：node scripts/ 相關
- **Git 唯讀**：status / diff / log
- **Git 寫入**：允許的 git add 路徑白名單、git commit
- **搜尋**：find / rg

### 硬性禁止
兩個來源合併顯示：
1. 從 .claude/settings.json permissions.deny 讀取的操作層禁令
2. 從 CLAUDE.md「硬性禁止」區塊讀取的語意層禁令

### 進行當前任務前的自查清單
根據「當前優先任務」的第一項，生成 3–5 條具體的「這件事我不會做」確認句，格式：
- [ ] 不會...
- [ ] 不會...
