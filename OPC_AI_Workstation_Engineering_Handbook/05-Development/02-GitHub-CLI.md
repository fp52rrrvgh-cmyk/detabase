# 05-Development / 02 GitHub CLI

## 目標
讓你與 Agent 能從終端機完成登入、clone、issue、PR 與 repository 狀態檢查。

## 安裝
```powershell
winget install --id GitHub.cli -e
```

## 登入
```powershell
gh auth login
```

建議選擇 GitHub.com、HTTPS 與瀏覽器登入。

## 驗證
```powershell
gh auth status
gh repo list --limit 20
```

## 常用指令
```powershell
gh repo clone OWNER/REPO
gh issue list
gh pr list
gh pr view NUMBER
gh pr checks NUMBER
```

## 權限原則
- 不把 Personal Access Token 寫進腳本
- 優先使用 `gh auth login`
- Agent 不應自動取得所有 repository 的寫入權限
- 高風險操作如 merge、delete、release 應受 HITL 控制

## 驗收
- `gh auth status` 顯示登入成功
- 可以列出自己的 repository
- 可以 clone 一個測試 repository
- 不存在明文 token
