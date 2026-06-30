[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet('Preflight','Workspace','Tools','WSL','Docker','Verify','All')]
    [string]$Phase = 'All',
    [string]$WorkspaceRoot = 'D:\OPC',
    [switch]$Resume
)

$ErrorActionPreference = 'Stop'
$StateDirectory = Join-Path $WorkspaceRoot 'runtime\bootstrap'
$StatePath = Join-Path $StateDirectory 'state.json'
$LogDirectory = Join-Path $WorkspaceRoot 'logs\bootstrap'
$LogPath = Join-Path $LogDirectory ("bootstrap-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))

function Write-Step([string]$Message) {
    $line = "[{0}] {1}" -f (Get-Date -Format o), $Message
    Write-Host $line
    Add-Content -Path $LogPath -Value $line
}

function Save-State([string]$CurrentPhase, [string]$Status, [string]$Message) {
    $state = [ordered]@{
        schema_version = 1
        current_phase = $CurrentPhase
        status = $Status
        message = $Message
        updated_at = (Get-Date).ToString('o')
        machine = $env:COMPUTERNAME
        user = $env:USERNAME
    }
    $state | ConvertTo-Json -Depth 4 | Set-Content -Path $StatePath -Encoding UTF8
}

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$identity
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Run PowerShell as Administrator for this phase.'
    }
}

function Test-CommandExists([string]$Name) {
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-WingetPackage([string]$Id) {
    if (-not (Test-CommandExists 'winget')) {
        throw 'winget is unavailable. Update App Installer from Microsoft Store first.'
    }
    Write-Step "Ensuring package is installed: $Id"
    if ($PSCmdlet.ShouldProcess($Id, 'Install or upgrade winget package')) {
        & winget install --id $Id -e --accept-package-agreements --accept-source-agreements
        if ($LASTEXITCODE -ne 0) {
            throw "winget failed for $Id with exit code $LASTEXITCODE"
        }
    }
}

New-Item -ItemType Directory -Path $StateDirectory,$LogDirectory -Force | Out-Null
Start-Transcript -Path $LogPath -Append | Out-Null

try {
    $phases = if ($Phase -eq 'All') { @('Preflight','Workspace','Tools','WSL','Docker','Verify') } else { @($Phase) }

    foreach ($current in $phases) {
        Save-State $current 'running' 'Phase started'
        Write-Step "Starting phase: $current"

        switch ($current) {
            'Preflight' {
                Assert-Administrator
                $os = Get-CimInstance Win32_OperatingSystem
                if ($os.Caption -notmatch 'Windows 11') { throw "Windows 11 required. Found: $($os.Caption)" }
                if (-not (Confirm-SecureBootUEFI)) { throw 'Secure Boot is not enabled.' }
                $tpm = Get-Tpm
                if (-not ($tpm.TpmPresent -and $tpm.TpmReady)) { throw 'TPM is not present and ready.' }
                $volume = Get-Volume -DriveLetter D -ErrorAction Stop
                if ($volume.FileSystem -ne 'NTFS' -or $volume.FileSystemLabel -ne 'OPC-DATA') {
                    throw "D: must be NTFS and labeled OPC-DATA. Found filesystem=$($volume.FileSystem), label=$($volume.FileSystemLabel)"
                }
                Write-Step 'Preflight passed.'
            }
            'Workspace' {
                $workspaceScript = Join-Path $PSScriptRoot 'bootstrap-opc-workspace.ps1'
                if (-not (Test-Path $workspaceScript)) { throw "Missing script: $workspaceScript" }
                & $workspaceScript -Root $WorkspaceRoot
                if ($LASTEXITCODE -ne 0) { throw 'Workspace bootstrap failed.' }
                Write-Step 'Workspace phase passed.'
            }
            'Tools' {
                Assert-Administrator
                Install-WingetPackage 'Microsoft.PowerShell'
                Install-WingetPackage 'Microsoft.WindowsTerminal'
                Install-WingetPackage 'Git.Git'
                Install-WingetPackage 'GitHub.cli'
                Install-WingetPackage 'Microsoft.VisualStudioCode'
                Install-WingetPackage 'Python.Python.3.13'
                Install-WingetPackage 'OpenJS.NodeJS.LTS'
                Write-Step 'Base tools installed. Reopen PowerShell before verification if commands are not yet on PATH.'
            }
            'WSL' {
                Assert-Administrator
                Write-Step 'Installing or updating WSL.'
                if ($PSCmdlet.ShouldProcess('WSL2', 'Install or update')) {
                    & wsl --install --no-launch
                    if ($LASTEXITCODE -ne 0) { throw "wsl --install failed with exit code $LASTEXITCODE" }
                    & wsl --update
                    if ($LASTEXITCODE -ne 0) { throw "wsl --update failed with exit code $LASTEXITCODE" }
                }
                Write-Step 'WSL phase completed. A reboot may be required before Ubuntu initialization.'
            }
            'Docker' {
                Assert-Administrator
                Install-WingetPackage 'Docker.DockerDesktop'
                Write-Step 'Docker Desktop installed. Start it manually, accept its terms, enable WSL2 backend, then run Verify.'
            }
            'Verify' {
                $verifyScript = Join-Path $PSScriptRoot 'verify-all.ps1'
                if (-not (Test-Path $verifyScript)) { throw "Missing script: $verifyScript" }
                & $verifyScript -WorkspaceRoot $WorkspaceRoot
                if ($LASTEXITCODE -ne 0) { throw 'Verification reported one or more FAIL results.' }
                Write-Step 'Verification passed.'
            }
        }

        Save-State $current 'completed' 'Phase completed successfully'
    }

    Save-State $Phase 'completed' 'Bootstrap completed successfully'
    Write-Step 'Bootstrap completed successfully.'
    exit 0
}
catch {
    Save-State $Phase 'failed' $_.Exception.Message
    Write-Step "FAILED: $($_.Exception.Message)"
    Write-Error $_
    exit 1
}
finally {
    Stop-Transcript | Out-Null
}
