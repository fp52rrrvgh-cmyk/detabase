# OPC 工作站建置與使用說明

這份文件不是寫給工程師看的維修手冊。

它的用途是：

> 讓一般使用者知道自己正在做什麼，並一步一步把一台 Windows 電腦準備成可承載多 Agent OPC 的工作站。

## OPC 是什麼

OPC 在本專案中指的是：

> 由多個 AI Worker 協作完成工作的一人公司系統。

理想流程是：

```text
你下達目標
→ OPC 自己拆解工作
→ 自己找資料
→ 多個 AI Worker 分工施工
→ 自己驗證
→ 早上交給你驗收
```

Phase 1 還不是在建立完整的多 Agent 公司。

Phase 1 只是在準備可靠的工作站地基。

---

## 你會建立什麼

```text
Windows 11
  日常使用、圖形介面與硬體驅動

WSL2
  Windows 裡的 Linux 工作區

Docker Desktop
  讓不同服務在分開的環境中執行

Git / GitHub
  保存程式與修改紀錄

Python / Node.js
  執行 OPC 程式與工具

PostgreSQL
  保存正式資料

Redis
  保存工作佇列、暫時狀態與快速資料
```

你不需要先理解每個工具的底層原理，只需要先知道它負責什麼。

---

## 從哪裡開始

唯一主線入口：

```text
11-Final/01-Master-Index.md
```

照該文件的順序操作即可。

其他章節分成兩類：

### 主線章節

安裝時真正需要閱讀的內容。

### 進階參考

遇到特定問題或想深入理解時才閱讀，例如：

- BitLocker
- Recovery 演練
- Registry
- Junction / Symlink
- Dev Drive
- 企業級安全與稽核

這些內容不再是完成 Phase 1 的必要門檻。

---

## 使用本手冊的方式

1. 一次只做一個階段。
2. 每一步先理解用途，再執行指令。
3. 看不懂格式化、刪除、reset、prune、unregister 或 `down -v` 時先停止。
4. 一般安裝錯誤通常可以修正，不需要一出錯就重灌。
5. TPM、Secure Boot、BitLocker、GitHub 2FA 並不是 OPC 運作的必要條件。
6. 若它們原本已啟用，可以保留；若沒有，不必為了本手冊額外啟用。
7. 真正成功不是文件越厚，而是你能理解、能重建、能使用。

---

## Phase 1 完成標準

只要以下項目正常，就代表 Phase 1 已具備實際價值：

- Windows 正常使用。
- Git、PowerShell、Python、Node.js 可以執行。
- WSL2 的 Ubuntu 正常啟動。
- Docker 可以執行容器。
- PostgreSQL 可以查詢。
- Redis 回傳 `PONG`。
- `verify-all.ps1` 沒有必要項目 FAIL。
- 你知道每個元件為什麼存在。

以下不再列為必要完成條件：

- BitLocker recovery key 演練。
- 完整災難復原流程。
- 每個步驟都產生稽核報告。
- 企業級安全政策。
- 完整 restore 演練。

---

## Phase 1 與 Phase 2 的邊界

### Phase 1

準備工作站：

```text
Windows
+ WSL2
+ Docker
+ Git
+ Python / Node.js
+ PostgreSQL / Redis
```

### Phase 2

建立真正的 OPC：

```text
多 Agent 協作
+ 任務拆解
+ Research Worker
+ Coding Worker
+ QA / Reviewer Worker
+ 自動驗證
+ Morning Report
```

工具只是手段。

最終目標始終是：

> 讓多個 AI Worker 像一間公司一樣協作，而你只負責下達目標與驗收成果。

---

## 目前狀態

```text
Phase 1 文件：重新修訂中
Phase 1 CI：既有腳本可驗證
Phase 1 實機重建：尚待執行
Phase 2：待 Phase 1 實機驗收後進入研究與設計
```
