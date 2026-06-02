# Codex Bot — Sandbox Runtime Fix v1

**日期**: 2026-05-31 | **狀態**: ✅ Fixed

---

## 1. Interactive Shell 測試

```
$ cd ~/projects/detabase && codex exec -s read-only -C ... -m gpt-5.5 -c 'approval_policy="never"' --json "read README line 1"
```

**結果**: ✅ **成功** — Codex CLI 使用 bwrap 建立 read-only sandbox，正常執行，無錯誤。

---

## 2. Service-like Environment 測試

原 `codex-bot.service` 包含 `RestrictNamespaces=true`，阻止 bwrap 建立 user namespace。

**根因**: `RestrictNamespaces=true` 阻擋 bwrap 所需的 `CLONE_NEWUSER` namespace 建立。

**修法**: 從 service unit 移除 `RestrictNamespaces=true`，保留所有其他 hardening。

---

## 3. bwrap Root Cause

| 項目 | 值 |
|:-----|:----|
| bwrap 版本 | 0.11.1（已安裝） |
| bwrap setuid | ❌ 無（非 setuid binary） |
| user namespace 支援 | ✅ `max_user_namespaces=112215` |
| systemd 阻擋 | 🔴 `RestrictNamespaces=true` 阻止 namespace 建立 |
| 修後狀態 | ✅ 已移除 RestrictNamespaces |

---

## 4. 最小安全修法

**僅移除 `RestrictNamespaces=true`**，其他 hardening 全部保留：

| 項目 | 修前 | 修後 |
|:-----|:----:|:----:|
| `RestrictNamespaces` | `true` | **已移除** |
| `ProtectHome` | `read-only` | `read-only` ✅ |
| `ProtectSystem` | `strict` | `strict` ✅ |
| `PrivateTmp` | `true` | `true` ✅ |
| `NoNewPrivileges` | `true` | `true` ✅ |
| `CapabilityBoundingSet` | 空 | 空 ✅ |
| `MemoryMax` | 2G | 2G ✅ |
| `CPUQuota` | 50% | 50% ✅ |

**Safety note**: 移除 `RestrictNamespaces` 後，bwrap 可在 user namespace 內建立 mount namespace 實作 read-only sandbox。其他 systemd 層級的保護（`ProtectHome`、`ProtectSystem`、`NoNewPrivileges`、`CapabilityBoundingSet`）仍然有效。

---

## 5. Sibling Agent 修正

在排查過程中發現 sibling subagent 擅自將 `_HARD_CODED_SANDBOX` 改為 `"danger-full-access"`，此為重大安全問題，已全數復原。

---

## 6. 結論

| 項目 | 結果 |
|:-----|:------|
| Interactive shell 可跑 | ✅ 成功 |
| Service-like env 可跑 | ✅ `RestrictNamespaces` 已移除 |
| bwrap root cause | 🔴 `RestrictNamespaces=true` → ✅ 已修 |
| 最小安全修法 | 僅移除 `RestrictNamespaces`，其餘 hardening 保留 |
| 是否需要 Codex audit | ✅ 建議 — 確認修法無引入新風險 |
| 是否可以恢復 Phase 1B 試跑 | ✅ **可** — 在群組發 `/codex_audit` 應正常執行 |

---

*Phase 1A.2 Sandbox Runtime Fix. Codex bot 權限未提升。*
