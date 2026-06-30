# 03-Windows / 04 帳號與權限策略

## 目標

保留日常使用便利性，同時降低 Agent、腳本與開發工具取得過高權限的風險。

## 建議帳號模型

### 日常帳號

- 平常登入使用。
- 可安裝一般軟體。
- 不應讓所有 Agent 永久以系統管理員身分執行。

### 系統管理權限

只在以下情境使用：

- 安裝驅動
- 啟用 WSL2 / Virtual Machine Platform
- 安裝 Docker Desktop
- 修改受保護的系統設定

## Agent 權限原則

Agent 預設只能操作：

```text
D:\OPC
```

不應預設取得：

- 整個 C 槽
- Windows 系統目錄
- 瀏覽器密碼
- 所有 secrets
- 系統管理員 PowerShell

## UAC

不要關閉 User Account Control。UAC 是最後一道人工確認邊界，可阻止未知腳本靜默取得高權限。

## Git 與 GitHub 身分

Git commit 身分與 GitHub 登入應分開設定並驗證：

```powershell
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_EMAIL"
gh auth login
gh auth status
```

## 驗收

- 日常操作不需全程使用 Administrator。
- UAC 保持啟用。
- `gh auth status` 正常。
- Agent workspace 權限限制在 `D:\OPC`。
