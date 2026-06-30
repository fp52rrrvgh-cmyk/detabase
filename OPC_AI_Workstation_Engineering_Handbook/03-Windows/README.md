# 03 Windows Engineering：Windows 11 建置原則

## 1. 目標

Windows 11 必須保留原本方便性與遊戲能力，同時成為 AI runtime 的穩定 host。

## 2. 不採用極端 Debloat

不使用網路上不明 debloat script。理由：

- 可能破壞 Windows Update。
- 可能破壞 Microsoft Store / Xbox / Game Bar。
- 可能破壞 WSL2 / Hyper-V / Docker。
- 難以回復，也難以追蹤改了什麼。

## 3. 採用白名單安裝

重灌後只安裝必要軟體：

### 系統與開發

```powershell
winget install --id Microsoft.PowerShell -e
winget install --id Git.Git -e
winget install --id GitHub.cli -e
winget install --id Microsoft.VisualStudioCode -e
winget install --id Python.Python.3.12 -e
winget install --id Docker.DockerDesktop -e
```

### 日常與遊戲

```powershell
winget install --id Google.Chrome -e
winget install --id Valve.Steam -e
```

Battle.net、NVIDIA App、遊戲平台可視需要手動安裝。

## 4. Windows 功能保留

不要關閉下列功能：

- Virtual Machine Platform
- Windows Subsystem for Linux
- Hyper-V 相關底層元件
- Windows Update
- Microsoft Defender

這些會影響 WSL2、Docker 或系統安全。

## 5. Defender 原則

不關閉 Defender。只針對可信任的開發資料夾做排除，例如：

```text
D:\OPC
```

但 secrets、下載資料夾、未知工具不應排除。

## 6. 驗收

```powershell
winget --version
git --version
gh --version
code --version
wsl --version
docker --version
```

全部能正常回應才進入下一階段。
