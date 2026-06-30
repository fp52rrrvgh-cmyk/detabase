# 00 Installation Roadmap：重灌後施工路線

## Phase 0：Windows 安裝完成後

1. 登入 Microsoft 帳號或本機帳號。
2. 安裝主機板 / GPU / 網路驅動。
3. 完成 Windows Update。
4. 安裝 PowerShell 7、Git、GitHub CLI、VS Code、Chrome。
5. 建立 `D:\OPC`。

## Phase 1：WSL2 與 Docker

1. `wsl --install`
2. 重開機。
3. 設定 Ubuntu。
4. 安裝 Docker Desktop。
5. 驗證 `docker run hello-world`。

## Phase 2：OPC Workspace

1. 建立標準目錄。
2. Clone GitHub 專案。
3. 建立 bootstrap scripts。
4. 建立 `.env.example`。

## Phase 3：AI Runtime

1. Python / uv。
2. Node / pnpm。
3. LangGraph。
4. Redis。
5. Hermes / OpenHands / MCP Gateway。

## Phase 4：Operations

1. `opc doctor`
2. `opc up`
3. `opc down`
4. `opc backup`

此路線會持續細化成可執行手冊。
