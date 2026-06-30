# OPC AI Workstation 工程手冊

本目錄是 OPC AI Workstation 的正式工程手冊。

## 目標

建立一台以 Windows 11 為日常與遊戲基礎、以 WSL2 / Docker 承載 AI Runtime 的單人 AI 工作站。

## 核心原則

1. Windows 負責日常、遊戲、驅動、圖形介面。
2. WSL2 負責 Linux 開發環境與 AI Runtime。
3. Docker 負責隔離服務、資料庫、Agent runtime。
4. 所有工程與 AI 工作統一進入 `D:\OPC`。
5. 不以真正合併硬碟解決路徑問題，而以單一 Workspace 與掛載/連結策略解決。
6. 重灌後必須能透過手冊與 Bootstrap 重建。

## 閱讀順序

1. `01-Foundation/`
2. `02-Architecture/`
3. `03-Windows/`
4. `04-Storage/`
5. `05-WSL2/`
6. `06-Docker/`
7. `07-Bootstrap/`
8. `ADR/`

## 目前狀態

這是可施工版本的第一批內容。後續會繼續擴充 Development、AI Runtime、Operations、Disaster Recovery。
