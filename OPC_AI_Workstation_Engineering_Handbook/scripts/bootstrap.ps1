#requires -Version 7.4
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [ValidateSet('Preflight','Workspace','Tools','WSL','Docker','Verify','All')]
    [string]$Phase = 'All',
    [string]$WorkspaceRoot = 'D:\OPC',
    [switch]$Resume,
    [Alias('DryRun')]
    [switch]$Preview,
    [switch]$NonInteractive
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

if ($PSVersionTable.PSEdition -ne 'Core' -or $PSVersionTable.PSVersion -lt [version]'7.4') {
    throw 'This script requires PowerShell 7.4 or later. Open pwsh and run it again.'
}

$StateDirectory = Join-Path $WorkspaceRoot 'runtime\bootstrap'
$StatePath = Join-Path $StateDirectory 'state.json'
$LogDirectory = Join-Path $WorkspaceRoot 'logs\bootstrap'
$LogPath = Join-Path $LogDirectory ("bootstrap-{0}.log" -f (Get-Date -Format 'yyyyMMdd-HHmmss'))

$WingetPackages = @(
    'Microsoft.PowerShell',
    'Microsoft.WindowsTerminal',
    'Git.Git',
    'GitHub.cli',
    'Microsoft.VisualStudioCode',
    'Python.Python.3.13',
    'OpenJS.NodeJS.LTS'
)

function Write-Step {
    param([Parameter(Mandatory)][string]$Message)
    $line = "[{0}] {1}" -f (Get-Date -Format o), $Message
    Write-Host $line
    if (Test-Path $LogDirectory) { Add-Content -Path $LogPath -Value $line }
}

function Save-State {
    param(
        [Parameter(Mandatory)][string]$CurrentPhase,
        [Parameter(Mandatory)][string]$Status,
        [Parameter(Mandatory)][string]$Message
    )

    if ($Preview) {
        Write-Step "PREVIEW state: phase=$CurrentPhase status=$Status message=$Message"
        return
    }

    [ordered]@{
        schema_version = 2
        current_phase = $CurrentPhase
        status = $Status
        message = $Message
        updated_at = (Get-Date).ToString('o')
        machine = $env:COMPUTERNAME
        user = $env:USERNAME
        powershell = $PSVersionTable.PSVersion.ToString()
        preview = $Preview.IsPresent
        non_interactive = $NonInteractive.IsPresent
    } | ConvertTo-Json -Depth 4 | Set-Content -Path $StatePath -Encoding UTF8
}

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$identity
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw 'Run PowerShell 7 as Administrator for this phase.'
    }
}

function Test-CommandExists {
    param([Parameter(Mandatory)][string]$Name)
    return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory)][string]$FilePath,
        [Parameter(Mandatory)][string[]]$ArgumentList,
        [Parameter(Mandatory)][string]$Description,
        [int[]]$SuccessExitCodes = @(0)
    )

    Write-Step $Description
    if ($Preview) {
        Write-Step "PREVIEW command: $FilePath $($ArgumentList -join ' ')"
        return
    }

    & $FilePath @ArgumentList
    if ($LASTEXITCODE -notin $SuccessExitCodes) {
        throw "$Description failed with exit code $LASTEXITCODE"
    }
}

function Test-WingetPackageId {
    param([Parameter(Mandatory)][string]$Id)

    if (-not (Test-CommandExists 'winget')) {
        throw 'winget is unavailable. Update App Installer from Microsoft Store first.'
    }

    Write-Step "Validating WinGet package ID: $Id"
    & winget show --id $Id --exact --accept-source-agreements *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "WinGet package ID cannot be resolved exactly: $Id. Run 'winget search $Id' and update the handbook before continuing."
    }
}

function Test-WingetPackageInstalled {
    param([Parameter(Mandatory)][string]$Id)
    & winget list --id $Id --exact --accept-source-agreements *> $null
    return $LASTEXITCODE -eq 0
}

function Install-WingetPackage {
    param([Parameter(Mandatory)][string]$Id)

    Test-WingetPackageId -Id $Id

    if ($Preview) {
        Write-Step "PREVIEW install or upgrade package: $Id"
        return
    }

    $common = @('--id', $Id, '--exact', '--accept-package-agreements', '--accept-source-agreements')
    if ($NonInteractive) { $common += '--disable-interactivity' }

    if (Test-WingetPackageInstalled -Id $Id) {
        Write-Step "Package already installed; checking upgrade: $Id"
        & winget upgrade @common
        if ($LASTEXITCODE -ne 0) {
            Write-Step "No upgrade applied or WinGet returned a non-zero upgrade result for $Id; installed package is retained."
        }
        return
    }

    Write-Step "Installing package: $Id"
    & winget install @common
    if ($LASTEXITCODE -ne 0) {
        throw "WinGet install failed for $Id with exit code $LASTEXITCODE"
    }
}

function Initialize-Logging {
    if ($Preview) {
        Write-Host '[PREVIEW] No state or log files will be written.'
        return
    }
    New-Item -ItemType Directory -Path $StateDirectory,$LogDirectory -Force | Out-Null
    Start-Transcript -Path $LogPath -Append | Out-Null
}

function Stop-Logging {
    if (-not $Preview) {
        try { Stop-Transcript | Out-Null } catch { }
    }
}

Initialize-Logging

try {
    $phases = if ($Phase -eq 'All') { @('Preflight','Workspace','Tools','WSL','Docker','Verify') } else { @($Phase) }

    foreach ($current in $phases) {
        Save-State -CurrentPhase $current -Status 'running' -Message 'Phase started'
        Write-Step "Starting phase: $current"

        switch ($current) {
            'Preflight' {
                if (-not $Preview) { Assert-Administrator }

                $os = Get-CimInstance Win32_OperatingSystem
                if ($os.Caption -notmatch 'Windows 11') { throw "Windows 11 required. Found: $($os.Caption)" }
                if (-not (Confirm-SecureBootUEFI)) { throw 'Secure Boot is not enabled.' }

                $tpm = Get-Tpm
                if (-not ($tpm.TpmPresent -and $tpm.TpmReady)) { throw 'TPM is not present and ready.' }

                $volume = Get-Volume -DriveLetter D -ErrorAction Stop
                if ($volume.FileSystem -ne 'NTFS' -or $volume.FileSystemLabel -ne 'OPC-DATA' -or $volume.HealthStatus -ne 'Healthy') {
                    throw "D: must be Healthy NTFS and labeled OPC-DATA. Found filesystem=$($volume.FileSystem), label=$($volume.FileSystemLabel), health=$($volume.HealthStatus)"
                }
                Write-Step 'Preflight passed.'
            }

            'Workspace' {
                $workspaceScript = Join-Path $PSScriptRoot 'bootstrap-opc-workspace.ps1'
                if (-not (Test-Path $workspaceScript)) { throw "Missing script: $workspaceScript" }

                $workspaceArguments = @('-Root', $WorkspaceRoot)
                if ($Preview) { $workspaceArguments += '-WhatIf' }
                & $workspaceScript @workspaceArguments
                if ($LASTEXITCODE -ne 0) { throw 'Workspace bootstrap failed.' }
                Write-Step 'Workspace phase passed.'
            }

            'Tools' {
                if (-not $Preview) { Assert-Administrator }
                foreach ($packageId in $WingetPackages) { Install-WingetPackage -Id $packageId }
                Write-Step 'Base tools validated. Reopen PowerShell if newly installed commands are not yet on PATH.'
            }

            'WSL' {
                if (-not $Preview) { Assert-Administrator }
                Write-Step 'Checking WSL state.'

                if (-not (Test-CommandExists 'wsl')) {
                    throw 'wsl.exe is unavailable. Confirm this is Windows 11 and Windows Update is complete.'
                }

                if ($Preview) {
                    Write-Step 'PREVIEW command: wsl --update'
                }
                else {
                    & wsl --status *> $null
                    if ($LASTEXITCODE -eq 0) {
                        Invoke-CheckedCommand -FilePath 'wsl' -ArgumentList @('--update') -Description 'Updating existing WSL'
                    }
                    else {
                        Invoke-CheckedCommand -FilePath 'wsl' -ArgumentList @('--install','--no-launch') -Description 'Installing WSL'
                        Invoke-CheckedCommand -FilePath 'wsl' -ArgumentList @('--update') -Description 'Updating WSL after installation'
                    }
                }
                Write-Step 'WSL phase completed. A reboot and Ubuntu first-run setup may still be required.'
            }

            'Docker' {
                if (-not $Preview) { Assert-Administrator }
                Install-WingetPackage -Id 'Docker.DockerDesktop'
                Write-Step 'Docker Desktop package is present. First launch, license acceptance, WSL2 backend, and Ubuntu integration remain manual steps.'
            }

            'Verify' {
                $verifyScript = Join-Path $PSScriptRoot 'verify-all.ps1'
                if (-not (Test-Path $verifyScript)) { throw "Missing script: $verifyScript" }

                if ($Preview) {
                    Write-Step "PREVIEW command: $verifyScript -WorkspaceRoot $WorkspaceRoot"
                }
                else {
                    & $verifyScript -WorkspaceRoot $WorkspaceRoot
                    if ($LASTEXITCODE -ne 0) { throw 'Verification reported one or more FAIL results.' }
                }
                Write-Step 'Verification phase completed.'
            }
        }

        Save-State -CurrentPhase $current -Status 'completed' -Message 'Phase completed successfully'
    }

    Save-State -CurrentPhase $Phase -Status 'completed' -Message 'Bootstrap completed successfully'
    Write-Step 'Bootstrap completed successfully.'
    exit 0
}
catch {
    Save-State -CurrentPhase $Phase -Status 'failed' -Message $_.Exception.Message
    Write-Step "FAILED: $($_.Exception.Message)"
    Write-Error $_
    exit 1
}
finally {
    Stop-Logging
}
