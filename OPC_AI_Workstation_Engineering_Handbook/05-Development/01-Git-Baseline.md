# 05-Development / 01 Git 基線

## 目標
建立穩定、可追蹤、可恢復的版本控制環境。

## 安裝
```powershell
winget install --id Git.Git -e
```

驗證：
```powershell
git --version
```

## 全域設定
```powershell
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_EMAIL"
git config --global init.defaultBranch main
git config --global core.autocrlf false
```

## Repository 位置
正式專案統一放在：
```text
D:\OPC\projects
```

避免放在 Desktop、Downloads、OneDrive 同步資料夾，也不要讓 Windows 與 WSL2 各自保存同一專案副本。

## Commit 原則
- 一次只處理一個主題
- 訊息可理解
- 不包含敏感資訊
- 不混入大型模型、快取與 build output

## 驗收
```powershell
cd D:\OPC\projects
mkdir git-test
cd git-test
git init
git status
```

確認預設分支為 main，身分設定正確，且專案路徑位於 `D:\OPC\projects`。
