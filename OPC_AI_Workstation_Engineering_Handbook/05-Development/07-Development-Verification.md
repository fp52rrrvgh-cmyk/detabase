# 05-Development / 07 開發環境驗收

## Git
```powershell
git --version
git config --global --list
```

## GitHub CLI
```powershell
gh auth status
gh repo list --limit 10
```

## VS Code
```powershell
code --version
code D:\OPC\projects
```

## Python / uv
```powershell
python --version
uv --version
```

建立測試專案並執行：
```powershell
cd D:\OPC\projects
uv init verify-python
cd verify-python
uv venv
uv run python -c "print('python-ok')"
```

## Node / pnpm
```powershell
node --version
pnpm --version
```

建立測試專案：
```powershell
cd D:\OPC\projects
mkdir verify-node
cd verify-node
pnpm init
```

## Secrets
確認：
- `.env` 不在 Git status
- `.env.example` 只有 placeholder
- PowerShell profile 不含 API key
- GitHub repository 不含明文 token

## 通過條件
- Git 與 GitHub CLI 正常
- VS Code 能開啟 OPC 專案
- Python/uv 可建立並執行專案
- Node/pnpm 可建立專案
- 專案可刪除虛擬環境與依賴後重建
- 敏感資訊未進 Git
