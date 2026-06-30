# 05-Development / 04 Python 與 uv

## 目標
建立單一、可重建的 Python 工作方式，避免多版本 Python、全域套件與虛擬環境互相污染。

## 採用方案
- Windows 保留一套主要 Python
- 專案使用獨立虛擬環境
- 依賴與執行優先使用 uv 管理
- 不使用全域 `pip install` 建立專案環境

## Python 驗證
```powershell
python --version
py --list
```

## 安裝 uv
依官方安裝方式安裝後驗證：
```powershell
uv --version
```

## 建立專案
```powershell
cd D:\OPC\projects
uv init example-python
cd example-python
uv venv
uv add requests
uv run python -c "import requests; print(requests.__version__)"
```

## 專案規則
- `pyproject.toml` 進 Git
- lock file 進 Git
- `.venv` 不進 Git
- 套件版本由專案管理
- Python 版本需求寫入專案設定

## 不建議
- 多個來源混裝 Python
- 對系統 Python 執行大量全域 pip install
- 手動複製 `.venv` 到新電腦
- 把 API key 寫進 Python 程式

## 驗收
- `uv --version` 正常
- 測試專案可建立
- 依賴可安裝
- `uv run` 可執行
- 刪除 `.venv` 後能依 lock file 重建
