# 10-Security-Recovery / 05 Network Security

## 目標

只開放 OPC Runtime 真正需要的連線，避免資料庫、Redis、Dashboard、MCP server 或 Agent service 暴露到不必要的網路。

## 網路區域

```text
Internet
Local Host
Docker Networks
WSL2 Network
Local Area Network
Remote Access
```

每個區域都必須有明確用途與信任等級。

## 本機服務

只供本機使用的服務綁定：

```text
127.0.0.1
```

Compose 範例：

```yaml
ports:
  - "127.0.0.1:3000:3000"
```

不要使用以下設定暴露所有介面，除非有明確需求：

```text
0.0.0.0:PORT
```

## 資料庫與 Queue

- PostgreSQL 與 Redis 優先只存在 Docker private network。
- 只有必要的管理或開發情境才映射 host port。
- 不把 database 或 Redis 直接暴露到 Internet。
- Container 互連使用 service name，不透過公開 port。

## Windows Firewall

- 保持 Windows Firewall 啟用。
- 規則依 Private、Public、Domain profile 區分。
- 不因連線問題直接關閉整個 Firewall。
- 新增規則時記錄 owner、port、protocol、scope 與到期日。

## Remote Access

遠端管理必須：

- 使用受控遠端工具或 VPN。
- 啟用多因素驗證。
- 不直接將 RDP、SSH、Dashboard 暴露到 Internet。
- 遠端工作完成後撤銷臨時存取。

## Egress 控制

高風險 worker 應只允許必要目的地，例如：

- GitHub
- 模型 API
- 官方套件來源
- 明確核准的研究網站

未知 domain、IP literal 與可疑下載應阻擋或升級人工審查。

## 驗收

- 未授權 LAN 裝置無法存取本機服務。
- PostgreSQL 與 Redis 未暴露到 Internet。
- Public profile 沒有不必要的 inbound rule。
- Tool Gateway 可記錄對外連線目的地。
- 關閉外網後，核心 durable state 仍可安全停止與恢復。