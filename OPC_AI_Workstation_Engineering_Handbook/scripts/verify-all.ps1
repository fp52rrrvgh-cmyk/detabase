#requires -Version 7.4
[CmdletBinding()]
param(
    [string]$WorkspaceRoot = 'D:\OPC',
    [string]$ExpectedVolumeLabel = 'OPC-DATA',
    [string]$OutputDirectory = 'D:\OPC\artifacts\verification',

    [ValidateSet('Full','Ci')]
    [string]$Mode = 'Full',

    [string]$OutputJson,
    [string]$OutputMarkdown,
    [switch]$SkipHardwareChecks,
    [switch]$FailOnSkip,
    [string]$RuntimePath = 'D:\OPC\runtime\opc-core'
)

$ErrorActionPreference = 'Continue'
$Results = [System.Collections.Generic.List[object]]::new()
$RunId = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssK')

if ($PSVersionTable.PSEdition -ne 'Core' -or $PSVersionTable.PSVersion -lt [version]'7.4') {
    Write-Error 'verify-all.ps1 requires PowerShell 7.4 or later.'
    exit 2
}

if ($Mode -eq 'Ci') {
    $SkipHardwareChecks = $true
    if ($OutputDirectory -eq 'D:\OPC\artifacts\verification') {
        $OutputDirectory = Join-Path $PSScriptRoot '..\artifacts\verification'
    }
}

function Add-Result {
    param(
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][ValidateSet('PASS','WARN','FAIL','SKIP')][string]$Status,
        [Parameter(Mandatory)][string]$Message,
        [string]$Evidence = ''
    )

    $Results.Add([pscustomobject]@{
        Id = $Id
        Status = $Status
        Message = $Message
        Evidence = $Evidence
        Timestamp = (Get-Date).ToString('o')
    })
}

function Test-CommandAvailable {
    param(
        [Parameter(Mandatory)][string]$Name,
        [bool]$Required = $true
    )

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) {
        Add-Result -Id "command.$Name" -Status PASS -Message "$Name is available" -Evidence $command.Source
        return $true
    }

    $status = if ($Required) { 'FAIL' } else { 'WARN' }
    Add-Result -Id "command.$Name" -Status $status -Message "$Name is not available"
    return $false
}

function Invoke-VersionCheck {
    param(
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][string]$Command,
        [string[]]$Arguments = @(),
        [bool]$Required = $true
    )

    try {
        $output = & $Command @Arguments 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($output)) {
            $firstLine = ($output.Trim() -split "`r?`n")[0]
            Add-Result -Id $Id -Status PASS -Message $firstLine -Evidence $output.Trim()
            return $true
        }

        $status = if ($Required) { 'FAIL' } else { 'WARN' }
        Add-Result -Id $Id -Status $status -Message ($output.Trim())
    }
    catch {
        $status = if ($Required) { 'FAIL' } else { 'WARN' }
        Add-Result -Id $Id -Status $status -Message $_.Exception.Message
    }

    return $false
}

function Add-HardwareSkip {
    param([Parameter(Mandatory)][string]$Id,[Parameter(Mandatory)][string]$Message)
    Add-Result -Id $Id -Status SKIP -Message $Message
}

try {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
}
catch {
    Write-Error "Cannot create verification output directory: $($_.Exception.Message)"
    exit 2
}

# Host metadata and Windows
try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    if ($os.Caption -match 'Windows 11') {
        Add-Result -Id 'windows.version' -Status PASS -Message "$($os.Caption) build $($os.BuildNumber)" -Evidence "Version=$($os.Version); Build=$($os.BuildNumber)"
    }
    else {
        Add-Result -Id 'windows.version' -Status FAIL -Message "Expected Windows 11, found $($os.Caption)"
    }
}
catch {
    Add-Result -Id 'windows.version' -Status FAIL -Message $_.Exception.Message
}

if ($SkipHardwareChecks) {
    Add-HardwareSkip -Id 'windows.secure-boot' -Message 'Hardware check skipped by mode or parameter'
    Add-HardwareSkip -Id 'windows.tpm' -Message 'Hardware check skipped by mode or parameter'
}
else {
    try {
        $secureBoot = Confirm-SecureBootUEFI -ErrorAction Stop
        Add-Result -Id 'windows.secure-boot' -Status $(if ($secureBoot) { 'PASS' } else { 'FAIL' }) -Message "Secure Boot: $secureBoot" -Evidence "Confirm-SecureBootUEFI=$secureBoot"
    }
    catch {
        Add-Result -Id 'windows.secure-boot' -Status FAIL -Message $_.Exception.Message
    }

    try {
        $tpm = Get-Tpm -ErrorAction Stop
        if ($tpm.TpmPresent -and $tpm.TpmReady) {
            Add-Result -Id 'windows.tpm' -Status PASS -Message 'TPM is present and ready' -Evidence "TpmPresent=$($tpm.TpmPresent); TpmReady=$($tpm.TpmReady)"
        }
        else {
            Add-Result -Id 'windows.tpm' -Status FAIL -Message "TpmPresent=$($tpm.TpmPresent), TpmReady=$($tpm.TpmReady)"
        }
    }
    catch {
        Add-Result -Id 'windows.tpm' -Status FAIL -Message $_.Exception.Message
    }
}

try {
    $defender = Get-MpComputerStatus -ErrorAction Stop
    if ($defender.AntivirusEnabled -and $defender.RealTimeProtectionEnabled) {
        Add-Result -Id 'windows.defender' -Status PASS -Message 'Defender antivirus and real-time protection are enabled' -Evidence "AMRunningMode=$($defender.AMRunningMode); AntivirusEnabled=$($defender.AntivirusEnabled); RealTimeProtectionEnabled=$($defender.RealTimeProtectionEnabled)"
    }
    else {
        Add-Result -Id 'windows.defender' -Status FAIL -Message "AntivirusEnabled=$($defender.AntivirusEnabled), RealTimeProtectionEnabled=$($defender.RealTimeProtectionEnabled)"
    }
}
catch {
    $status = if ($Mode -eq 'Ci') { 'SKIP' } else { 'FAIL' }
    Add-Result -Id 'windows.defender' -Status $status -Message $_.Exception.Message
}

# Storage and workspace
if ($SkipHardwareChecks) {
    Add-HardwareSkip -Id 'storage.opc-data' -Message 'Physical D: validation skipped by mode or parameter'
    Add-HardwareSkip -Id 'storage.free-space' -Message 'Physical D: capacity validation skipped by mode or parameter'
}
else {
    try {
        $volume = Get-Volume -DriveLetter D -ErrorAction Stop
        if ($volume.FileSystem -eq 'NTFS' -and $volume.FileSystemLabel -eq $ExpectedVolumeLabel -and $volume.HealthStatus -eq 'Healthy') {
            Add-Result -Id 'storage.opc-data' -Status PASS -Message "D: is Healthy NTFS labeled $ExpectedVolumeLabel" -Evidence "UniqueId=$($volume.UniqueId); Size=$($volume.Size); Remaining=$($volume.SizeRemaining)"
        }
        else {
            Add-Result -Id 'storage.opc-data' -Status FAIL -Message "D: filesystem=$($volume.FileSystem), label=$($volume.FileSystemLabel), health=$($volume.HealthStatus)"
        }

        $freePercent = [math]::Round(($volume.SizeRemaining / $volume.Size) * 100, 1)
        if ($freePercent -ge 20) {
            Add-Result -Id 'storage.free-space' -Status PASS -Message "D: free space is $freePercent%"
        }
        elseif ($freePercent -ge 10) {
            Add-Result -Id 'storage.free-space' -Status WARN -Message "D: free space is only $freePercent%"
        }
        else {
            Add-Result -Id 'storage.free-space' -Status FAIL -Message "D: free space is critically low at $freePercent%"
        }
    }
    catch {
        Add-Result -Id 'storage.opc-data' -Status FAIL -Message $_.Exception.Message
    }
}

$requiredDirectories = @('projects','workspace','runtime','artifacts','knowledge','models','logs','sandbox','config','secrets','backups','tools')
if (Test-Path $WorkspaceRoot -PathType Container) {
    Add-Result -Id 'workspace.root' -Status PASS -Message "$WorkspaceRoot exists"
    foreach ($directory in $requiredDirectories) {
        $path = Join-Path $WorkspaceRoot $directory
        if (Test-Path $path -PathType Container) {
            Add-Result -Id "workspace.$directory" -Status PASS -Message "$path exists"
        }
        else {
            Add-Result -Id "workspace.$directory" -Status FAIL -Message "$path is missing"
        }
    }
}
else {
    $status = if ($Mode -eq 'Ci') { 'SKIP' } else { 'FAIL' }
    Add-Result -Id 'workspace.root' -Status $status -Message "$WorkspaceRoot does not exist"
}

$markerPath = Join-Path $WorkspaceRoot '.opc-workspace.json'
if (Test-Path $markerPath -PathType Leaf) {
    Add-Result -Id 'workspace.marker' -Status PASS -Message "$markerPath exists"
}
else {
    $status = if ($Mode -eq 'Ci') { 'SKIP' } else { 'WARN' }
    Add-Result -Id 'workspace.marker' -Status $status -Message 'Workspace marker is missing'
}

# Development commands
$commandState = @{}
$requiredCommands = if ($Mode -eq 'Ci') { @('git','pwsh') } else { @('git','gh','code','pwsh','python','uv','node','pnpm','wsl','docker') }
foreach ($command in $requiredCommands) {
    $commandState[$command] = Test-CommandAvailable -Name $command -Required $true
}

if ($commandState['git']) { Invoke-VersionCheck -Id 'version.git' -Command 'git' -Arguments @('--version') | Out-Null }
if ($commandState['gh']) {
    Invoke-VersionCheck -Id 'version.gh' -Command 'gh' -Arguments @('--version') | Out-Null
    try {
        & gh auth status *> $null
        Add-Result -Id 'github.auth' -Status $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) -Message $(if ($LASTEXITCODE -eq 0) { 'GitHub CLI authentication is valid' } else { 'GitHub CLI is not authenticated' })
    }
    catch {
        Add-Result -Id 'github.auth' -Status FAIL -Message $_.Exception.Message
    }
}
if ($commandState['pwsh']) { Invoke-VersionCheck -Id 'version.pwsh' -Command 'pwsh' -Arguments @('--version') | Out-Null }
if ($commandState['python']) { Invoke-VersionCheck -Id 'version.python' -Command 'python' -Arguments @('--version') | Out-Null }
if ($commandState['uv']) { Invoke-VersionCheck -Id 'version.uv' -Command 'uv' -Arguments @('--version') | Out-Null }
if ($commandState['node']) { Invoke-VersionCheck -Id 'version.node' -Command 'node' -Arguments @('--version') | Out-Null }
if ($commandState['pnpm']) { Invoke-VersionCheck -Id 'version.pnpm' -Command 'pnpm' -Arguments @('--version') | Out-Null }

# WSL2
if ($Mode -eq 'Ci') {
    Add-HardwareSkip -Id 'wsl.version' -Message 'WSL runtime check skipped in CI mode'
    Add-HardwareSkip -Id 'wsl.workspace' -Message 'WSL mount check skipped in CI mode'
}
elseif ($commandState['wsl']) {
    try {
        $wslOutput = (& wsl -l -v 2>&1 | Out-String)
        if ($LASTEXITCODE -ne 0) {
            Add-Result -Id 'wsl.version' -Status FAIL -Message $wslOutput.Trim()
        }
        elseif ($wslOutput -match '(?m)^\s*\*?\s*\S+\s+\S+\s+2\s*$') {
            Add-Result -Id 'wsl.version' -Status PASS -Message 'At least one WSL2 distribution was detected' -Evidence $wslOutput.Trim()
        }
        else {
            Add-Result -Id 'wsl.version' -Status FAIL -Message 'No distribution with VERSION 2 was detected' -Evidence $wslOutput.Trim()
        }
    }
    catch {
        Add-Result -Id 'wsl.version' -Status FAIL -Message $_.Exception.Message
    }

    try {
        & wsl -e sh -lc "test -d /mnt/d/OPC && test -w /mnt/d/OPC/workspace" *> $null
        Add-Result -Id 'wsl.workspace' -Status $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) -Message $(if ($LASTEXITCODE -eq 0) { '/mnt/d/OPC is visible and workspace is writable' } else { '/mnt/d/OPC is missing or not writable' })
    }
    catch {
        Add-Result -Id 'wsl.workspace' -Status FAIL -Message $_.Exception.Message
    }
}

# Docker and runtime foundation
if ($Mode -eq 'Ci') {
    Add-HardwareSkip -Id 'docker.engine' -Message 'Docker Desktop check skipped in CI mode'
    Add-HardwareSkip -Id 'docker.hello-world' -Message 'Container smoke test skipped in CI mode'
    Add-HardwareSkip -Id 'runtime.compose' -Message 'Runtime health check skipped in CI mode'
}
elseif ($commandState['docker']) {
    try {
        & docker info *> $null
        Add-Result -Id 'docker.engine' -Status $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) -Message $(if ($LASTEXITCODE -eq 0) { 'Docker engine is available' } else { 'Docker CLI exists but engine is unavailable' })
    }
    catch {
        Add-Result -Id 'docker.engine' -Status FAIL -Message $_.Exception.Message
    }

    try {
        & docker run --rm hello-world *> $null
        Add-Result -Id 'docker.hello-world' -Status $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) -Message $(if ($LASTEXITCODE -eq 0) { 'hello-world completed successfully' } else { 'hello-world failed' })
    }
    catch {
        Add-Result -Id 'docker.hello-world' -Status FAIL -Message $_.Exception.Message
    }

    $composePath = Join-Path $RuntimePath 'compose.yaml'
    if (Test-Path $composePath -PathType Leaf) {
        try {
            $composeJson = & docker compose -f $composePath -p opc-core ps --format json 2>&1 | Out-String
            if ($LASTEXITCODE -ne 0) {
                Add-Result -Id 'runtime.compose' -Status FAIL -Message $composeJson.Trim()
            }
            else {
                $services = @()
                foreach ($line in ($composeJson -split "`r?`n" | Where-Object { $_.Trim() })) {
                    try { $services += ($line | ConvertFrom-Json) } catch { }
                }

                $unhealthy = @($services | Where-Object { $_.State -ne 'running' -or ($_.Health -and $_.Health -ne 'healthy') })
                if ($services.Count -eq 0) {
                    Add-Result -Id 'runtime.compose' -Status FAIL -Message 'No opc-core services were returned by docker compose ps'
                }
                elseif ($unhealthy.Count -gt 0) {
                    Add-Result -Id 'runtime.compose' -Status FAIL -Message 'One or more opc-core services are not running and healthy' -Evidence $composeJson.Trim()
                }
                else {
                    Add-Result -Id 'runtime.compose' -Status PASS -Message 'All opc-core services are running and healthy' -Evidence $composeJson.Trim()
                }
            }
        }
        catch {
            Add-Result -Id 'runtime.compose' -Status FAIL -Message $_.Exception.Message
        }
    }
    else {
        Add-Result -Id 'runtime.compose' -Status WARN -Message "Runtime compose file not found at $composePath"
    }
}

# NVIDIA is optional
if ($Mode -eq 'Ci' -or $SkipHardwareChecks) {
    Add-HardwareSkip -Id 'gpu.nvidia' -Message 'GPU check skipped by mode or parameter'
}
elseif (Get-Command 'nvidia-smi' -ErrorAction SilentlyContinue) {
    try {
        $gpuOutput = & nvidia-smi 2>&1 | Out-String
        Add-Result -Id 'gpu.nvidia' -Status $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) -Message $(if ($LASTEXITCODE -eq 0) { 'NVIDIA driver responds to nvidia-smi' } else { 'nvidia-smi failed' }) -Evidence $gpuOutput.Trim()
    }
    catch {
        Add-Result -Id 'gpu.nvidia' -Status FAIL -Message $_.Exception.Message
    }
}
else {
    Add-Result -Id 'gpu.nvidia' -Status SKIP -Message 'nvidia-smi is absent; valid only when this machine has no NVIDIA GPU'
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if (-not $OutputJson) { $OutputJson = Join-Path $OutputDirectory "verification-$timestamp.json" }
if (-not $OutputMarkdown) { $OutputMarkdown = Join-Path $OutputDirectory "verification-$timestamp.md" }

$hostInfo = [ordered]@{
    computer_name = $env:COMPUTERNAME
    powershell = $PSVersionTable.PSVersion.ToString()
    mode = $Mode
    workspace_root = $WorkspaceRoot
    runtime_path = $RuntimePath
}

$passCount = @($Results | Where-Object Status -eq 'PASS').Count
$warnCount = @($Results | Where-Object Status -eq 'WARN').Count
$failCount = @($Results | Where-Object Status -eq 'FAIL').Count
$skipCount = @($Results | Where-Object Status -eq 'SKIP').Count
$overall = if ($failCount -gt 0) { 'FAIL' } elseif ($FailOnSkip -and $skipCount -gt 0) { 'FAIL' } elseif ($warnCount -gt 0 -or $skipCount -gt 0) { 'CONDITIONAL' } else { 'PASS' }

$report = [ordered]@{
    schema_version = 2
    run_id = $RunId
    host = $hostInfo
    checks = $Results
    summary = [ordered]@{
        pass = $passCount
        warn = $warnCount
        fail = $failCount
        skip = $skipCount
        overall = $overall
    }
}

$report | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputJson -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# OPC Workstation Verification Report')
$lines.Add('')
$lines.Add("- Run ID: $RunId")
$lines.Add("- Host: $($hostInfo.computer_name)")
$lines.Add("- PowerShell: $($hostInfo.powershell)")
$lines.Add("- Mode: $Mode")
$lines.Add("- Overall: **$overall**")
$lines.Add('')
$lines.Add('| Check | Status | Message | Evidence |')
$lines.Add('|---|---|---|---|')
foreach ($result in $Results) {
    $message = ($result.Message -replace '\|','/' -replace "`r?`n",' ')
    $evidence = ($result.Evidence -replace '\|','/' -replace "`r?`n",' ')
    $lines.Add("| $($result.Id) | $($result.Status) | $message | $evidence |")
}
$lines.Add('')
$lines.Add("PASS: $passCount  WARN: $warnCount  FAIL: $failCount  SKIP: $skipCount")
$lines | Set-Content -Path $OutputMarkdown -Encoding UTF8

$Results | Format-Table Id,Status,Message -AutoSize
Write-Host ''
Write-Host "OVERALL: $overall"
Write-Host "PASS: $passCount  WARN: $warnCount  FAIL: $failCount  SKIP: $skipCount"
Write-Host "JSON: $OutputJson"
Write-Host "Markdown: $OutputMarkdown"

if ($overall -eq 'FAIL') { exit 1 }
exit 0
