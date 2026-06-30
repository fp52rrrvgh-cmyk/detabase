# 10-Security-Recovery / 04 Agent Sandbox 與檔案系統政策

## 目標

讓每個 Agent 在獨立工作區執行，只能讀寫被授權的路徑，並限制程序、網路、時間與資源。

## Session 根目錄

```text
D:\OPC\sandbox\sessions\<session-id>
├─ input\
├─ workspace\
├─ output\
├─ logs\
└─ manifest.json
```

## 預設路徑政策

### 可讀寫

- 當前 Session workspace
- 當前任務指定 artifact output
- 明確授權的 repository worktree

### 唯讀

- 任務輸入資料
- 指定 knowledge source
- 必要的非敏感設定

### 預設禁止

- `C:\Windows`
- 瀏覽器 profile
- 其他 Session 目錄
- `D:\OPC\secrets`
- 未授權 repository
- BitLocker 與 Recovery Key 資料

## Repository 隔離

Coding worker 應使用：

- 獨立 branch
- 獨立 Git worktree 或 clone
- 明確 base commit
- 禁止直接修改 protected branch

## 程序限制

每個 Session 應設定：

- 最大執行時間
- CPU 與 RAM 上限
- GPU allocation
- 子程序數量
- 磁碟配額
- 可執行工具白名單

## 網路限制

- 預設無外網或僅允許必要 domain。
- Research task 與 coding task 使用不同網路政策。
- 不可信內容不可直接取得高權限工具。
- 對外 side effect 由 Tool Gateway 執行，不由任意 shell 直接執行。

## Session 結束

```text
停止程序
→ 撤銷 credential
→ 掃描 output
→ 建立 checksum
→ 搬移已核准 artifact
→ 保存必要 log
→ 清理可丟棄 workspace
```

## 驗收

- Agent 無法讀取其他 Session。
- 越界路徑操作被拒絕並記錄。
- 超時或資源超限時 Session 被停止。
- Artifact 搬出前經過掃描與驗證。
- Session 清理不會刪除正式 repository 或 evidence。