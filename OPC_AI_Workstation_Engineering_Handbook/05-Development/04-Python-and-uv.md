# 05-Development / 04 Python 與 uv

## 目標

建立可重建、彼此隔離的 Python 環境，避免多版本 Python、全域套件與虛擬環境互相污染。

## 固定原則

- Windows 只保留一套主要 Python。
- 每個專案使用自己的虛擬環境。
- 依賴與執行優先使用 uv。
- 不使用大量全域 `pip install`。
- `pyproject.toml` 與 lock file 進 Git；`.venv` 不進 Git。

## Step 1：確認目前 Python

```powershell
python --version
py --list
where.exe python
```

若 `python` 被 Microsoft Store alias 攔截，先到：

```text
設定
→ 應用程式
→ 進階應用程式設定
→ 應用程式執行別名
```

關閉不需要的 `python.exe` / `python3.exe` Store alias，再重新開啟 PowerShell。

## Step 2：安裝主要 Python

先使用 winget 搜尋官方可用版本：

```powershell
winget search Python.Python
```

安裝專案要求的穩定版本。不要同時裝多個來源。

安裝後重新開 PowerShell，再檢查：

```powershell
python --version
py --list
```

## Step 3：安裝 uv

使用 uv 官方安裝程式：

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

關閉並重新開啟 PowerShell，驗證：

```powershell
uv --version
where.exe uv
```

執行網路安裝腳本前，來源必須是 uv 官方網域。不要從論壇複製修改版指令。

## Step 4：建立測試專案

```powershell
Set-Location D:\OPC\workspace
uv init example-python
Set-Location .\example-python
uv venv
uv add requests
uv run python -c "import requests; print(requests.__version__)"
```

正常結果：

- 建立 `pyproject.toml`。
- 建立 uv lock file。
- 建立 `.venv`。
- Python 可成功 import requests。

## Step 5：測試可重建性

先確認測試專案沒有重要資料，再刪除虛擬環境：

```powershell
Remove-Item .venv -Recurse -Force
uv sync
uv run python -c "import requests; print(requests.__version__)"
```

如果可以重新執行，代表環境可由專案設定重建。

## Step 6：Git 規則

`.gitignore` 至少包含：

```gitignore
.venv/
__pycache__/
*.pyc
.env
```

提交：

- `pyproject.toml`
- uv lock file
- 原始碼

不提交：

- `.venv`
- API key
- Cache

## 禁止事項

- 從 Microsoft Store、python.org、Conda 與其他管理器混裝同一用途的 Python。
- 對系統 Python 大量執行 `pip install`。
- 把 `.venv` 複製到新電腦。
- 把 API key 寫進 Python 原始碼。
- 在不明 repository 直接執行安裝腳本。

## 完成條件

- [ ] `python --version` 成功。
- [ ] `uv --version` 成功。
- [ ] 測試專案可建立與執行。
- [ ] 刪除 `.venv` 後可用 `uv sync` 重建。
- [ ] `.venv` 與 secrets 不進 Git。

## 停止條件

- `where.exe python` 顯示多個不明來源。
- Python 版本與專案需求不符。
- `uv sync` 無法依 lock file 重建。
- 安裝依賴時要求執行來源不明的系統命令。
