# Official Source Registry

Review date: 2026-06-30

Only primary sources are accepted for version-sensitive installation and security instructions unless no primary source exists.

| Topic | Official source | What it supports | Review trigger |
|---|---|---|---|
| Windows 11 download | https://www.microsoft.com/software-download/windows11 | Official Media Creation Tool and multi-edition ISO; installation media destroys existing USB content | Before every reinstall |
| Windows release information | https://learn.microsoft.com/windows/release-health/windows11-release-information | Current servicing releases, support dates, and the special scope of 26H1 | Monthly and before reinstall |
| Windows 11 requirements | https://learn.microsoft.com/windows/whats-new/windows-11-requirements | TPM, Secure Boot, CPU/RAM/storage and account requirements | Before hardware or edition changes |
| Windows installation media | https://support.microsoft.com/windows/create-installation-media-for-windows-99a58364-8c02-206f-aa6f-40c3b507420d | Official media creation and clean-install purpose | Before every reinstall |
| WSL installation | https://learn.microsoft.com/windows/wsl/install | Supported `wsl --install` path and WSL2 default behavior | Before WSL installation |
| WSL commands | https://learn.microsoft.com/windows/wsl/basic-commands | Current command syntax for install, update, status, export, import, shutdown | Before script release |
| WSL advanced settings | https://learn.microsoft.com/windows/wsl/wsl-config | `.wslconfig`, `wsl.conf`, version-sensitive and experimental options | Before changing resource settings |
| Docker Desktop Windows install | https://docs.docker.com/desktop/setup/install/windows-install/ | Current prerequisites and installer behavior | Before Docker installation |
| Docker Desktop WSL2 backend | https://docs.docker.com/desktop/features/wsl/ | Supported WSL2 backend architecture | Before Docker/WSL architecture changes |
| Docker Desktop WSL use | https://docs.docker.com/desktop/features/wsl/use-wsl/ | WSL integration and development workflow | Before path/workflow changes |
| Docker WSL best practices | https://docs.docker.com/desktop/features/wsl/best-practices/ | File-system and WSL2 operational recommendations | Before performance tuning |
| Docker GPU support | https://docs.docker.com/desktop/features/gpu/ | GPU support availability on Windows with WSL2 backend | Before GPU container setup |
| Docker Desktop license | https://docs.docker.com/subscription/desktop-license/ | Licensing terms and subscription applicability | Before organizational/commercial use |
| BitLocker overview | https://support.microsoft.com/windows/security/encryption/bitlocker-overview | Device Encryption/BitLocker behavior and account-backed recovery keys | Before encryption changes |
| Find BitLocker recovery key | https://support.microsoft.com/windows/finding-your-bitlocker-recovery-key-in-windows-6b71ad27-0b89-ea08-f143-056f5ab347d6 | Recovery-key locations and consequence of losing the key | Before BIOS, TPM, disk, or reinstall work |
| Back up BitLocker recovery key | https://support.microsoft.com/windows/back-up-your-bitlocker-recovery-key-e63607b4-77fb-4ad3-8022-d6dc428fbd0d | Supported recovery-key backup methods | Before enabling encryption |
| BitLocker recovery process | https://learn.microsoft.com/windows/security/operating-system-security/data-protection/bitlocker/recovery-process | Enterprise recovery considerations and recovery information | Before recovery runbook release |

## Source handling rules

- Record the exact page title, URL, review date, and affected handbook files.
- Do not copy long passages; summarize the requirement and retain the link.
- When an official page changes materially, reopen every dependent handbook decision.
- Community posts may be used only as incident examples, never as the authority for destructive commands.
- Manufacturer-specific BIOS and driver sources must be added after the exact motherboard, GPU, NIC, and SSD models are recorded.
