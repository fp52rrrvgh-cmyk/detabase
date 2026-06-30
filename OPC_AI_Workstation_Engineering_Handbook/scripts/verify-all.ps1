#requires -Version 7.4
[CmdletBinding()]
param(
    [string]$WorkspaceRoot = 'D:\OPC',
    [string]$ExpectedVolumeLabel = 'OPC-DATA',
    [string]$ExpectedVolumeUniqueId,
    [string]$OutputDirectory = 'D:\OPC\artifacts\verification',
    [ValidateSet('Full','Ci')][string]$Mode = 'Full',
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

function Add-Skip {
    param([string]$Id,[string]$Message)
    Add-Result -Id $Id -Status SKIP -Message $Message
}

function Test-CommandAvailable {
    param([string]$Name,[bool]$Required = $true)
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) {
        Add-Result -Id "command.$Name" -Status PASS -Message "$Name is available" -Evidence $command.Source
        return $true
    }
    Add-Result -Id "command.$Name" -Status $(if ($Required) { 'FAIL' } else { 'WARN' }) -Message "$Name is not available"
    return $false
}

function Invoke-VersionCheck {
    param([string]$Id,[string]$Command,[string[]]$Arguments = @(),[bool]$Required = $true)
    try {
        $output = & $Command @Arguments 2>&1 | Out-String
        if ($LASTEXITCODE -eq 0 -and $output.Trim()) {
            Add-Result -Id $Id -Status PASS -Message (($output.Trim() -split "`r?`n")[0]) -Evidence $output.Trim()
            return $true
        }
        Add-Result -Id $Id -Status $(if ($Required) { 'FAIL' } else { 'WARN' }) -Message $output.Trim()
    }
    catch {
        Add-Result -Id $Id -Status $(if ($Required) { 'FAIL' } else { 'WARN' }) -Message $_.Exception.Message
    }
    return $false
}

try {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
}
catch {
    Write-Error "Cannot create verification output directory: $($_.Exception.Message)"
    exit 2
}

# Windows host
try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    Add-Result -Id 'windows.version' -Status $(if ($os.Caption -match 'Windows 11') { 'PASS' } else { 'FAIL' }) -Message "$($os.Caption) build $($os.BuildNumber)" -Evidence "Version=$($os.Version); Build=$($os.BuildNumber)"
}
catch { Add-Result -Id 'windows.version' -Status FAIL -Message $_.Exception.Message }

if ($SkipHardwareChecks) {
    Add-Skip 'windows.secure-boot' 'Hardware check skipped by mode or parameter'
    Add-Skip 'windows.tpm' 'Hardware check skipped by mode or parameter'
}
else {
    try {
        $secureBoot = Confirm-SecureBootUEFI -ErrorAction Stop
        Add-Result -Id 'windows.secure-boot' -Status $(if ($secureBoot) { 'PASS' } else { 'FAIL' }) -Message "Secure Boot: $secureBoot" -Evidence "Confirm-SecureBootUEFI=$secureBoot"
    }
    catch { Add-Result -Id 'windows.secure-boot' -Status FAIL -Message $_.Exception.Message }

    try {
        $tpm = Get-Tpm -ErrorAction Stop
        $ok = $tpm.TpmPresent -and $tpm.TpmReady
        Add-Result -Id 'windows.tpm' -Status $(if ($ok) { 'PASS' } else { 'FAIL' }) -Message "TpmPresent=$($tpm.TpmPresent), TpmReady=$($tpm.TpmReady)"
    }
    catch { Add-Result -Id 'windows.tpm' -Status FAIL -Message $_.Exception.Message }
}

try {
    $defender = Get-MpComputerStatus -ErrorAction Stop
    $ok = $defender.AntivirusEnabled -and $defender.RealTimeProtectionEnabled
    Add-Result -Id 'windows.defender' -Status $(if ($ok) { 'PASS' } else { 'FAIL' }) -Message "AntivirusEnabled=$($defender.AntivirusEnabled), RealTimeProtectionEnabled=$($defender.RealTimeProtectionEnabled)" -Evidence "AMRunningMode=$($defender.AMRunningMode)"
}
catch {
    Add-Result -Id 'windows.defender' -Status $(if ($Mode -eq 'Ci') { 'SKIP' } else { 'FAIL' }) -Message $_.Exception.Message
}

# Storage identity
if ($SkipHardwareChecks) {
    Add-Skip 'storage.opc-data' 'Physical D: validation skipped by mode or parameter'
    Add-Skip 'storage.identity' 'Volume identity validation skipped by mode or parameter'
    Add-Skip 'storage.free-space' 'Physical D: capacity validation skipped by mode or parameter'
}
else {
    try {
        $volume = Get-Volume -DriveLetter D -ErrorAction Stop
        $healthy = $volume.FileSystem -eq 'NTFS' -and $volume.FileSystemLabel -eq $ExpectedVolumeLabel -and $volume.HealthStatus -eq 'Healthy'
        Add-Result -Id 'storage.opc-data' -Status $(if ($healthy) { 'PASS' } else { 'FAIL' }) -Message "filesystem=$($volume.FileSystem), label=$($volume.FileSystemLabel), health=$($volume.HealthStatus)" -Evidence "UniqueId=$($volume.UniqueId); Path=$($volume.Path); Size=$($volume.Size); Remaining=$($volume.SizeRemaining)"

        if ([string]::IsNullOrWhiteSpace($ExpectedVolumeUniqueId)) {
            Add-Result -Id 'storage.identity' -Status WARN -Message 'ExpectedVolumeUniqueId was not supplied; current identity was recorded but not compared' -Evidence "UniqueId=$($volume.UniqueId); Path=$($volume.Path)"
        }
        elseif ($volume.UniqueId -eq $ExpectedVolumeUniqueId) {
            Add-Result -Id 'storage.identity' -Status PASS -Message 'D: Volume UniqueId matches the recorded recovery value' -Evidence $volume.UniqueId
        }
        else {
            Add-Result -Id 'storage.identity' -Status FAIL -Message 'D: Volume UniqueId does not match the expected recovery value' -Evidence "Expected=$ExpectedVolumeUniqueId; Actual=$($volume.UniqueId)"
        }

        $freePercent = [math]::Round(($volume.SizeRemaining / $volume.Size) * 100, 1)
        $freeStatus = if ($freePercent -ge 20) { 'PASS' } elseif ($freePercent -ge 10) { 'WARN' } else { 'FAIL' }
        Add-Result -Id 'storage.free-space' -Status $freeStatus -Message "D: free space is $freePercent%"
    }
    catch { Add-Result -Id 'storage.opc-data' -Status FAIL -Message $_.Exception.Message }
}

$requiredDirectories = @('projects','workspace','runtime','artifacts','knowledge','models','logs','sandbox','config','secrets','backups','tools')
if (Test-Path $WorkspaceRoot -PathType Container) {
    Add-Result -Id 'workspace.root' -Status PASS -Message "$WorkspaceRoot exists"
    foreach ($directory in $requiredDirectories) {
        $path = Join-Path $WorkspaceRoot $directory
        Add-Result -Id "workspace.$directory" -Status $(if (Test-Path $path -PathType Container) { 'PASS' } else { 'FAIL' }) -Message $(if (Test-Path $path -PathType Container) { "$path exists" } else { "$path is missing" })
    }
}
else {
    Add-Result -Id 'workspace.root' -Status $(if ($Mode -eq 'Ci') { 'SKIP' } else { 'FAIL' }) -Message "$WorkspaceRoot does not exist"
}

$markerPath = Join-Path $WorkspaceRoot '.opc-workspace.json'
Add-Result -Id 'workspace.marker' -Status $(if (Test-Path $markerPath -PathType Leaf) { 'PASS' } elseif ($Mode -eq 'Ci') { 'SKIP' } else { 'WARN' }) -Message $(if (Test-Path $markerPath -PathType Leaf) { "$markerPath exists" } else { 'Workspace marker is missing' })

# Development commands
$commandState = @{}
$requiredCommands = if ($Mode -eq 'Ci') { @('git','pwsh') } else { @('git','gh','code','pwsh','python','uv','node','pnpm','wsl','docker') }
foreach ($command in $requiredCommands) { $commandState[$command] = Test-CommandAvailable -Name $command -Required $true }

if ($commandState['git']) { Invoke-VersionCheck 'version.git' 'git' @('--version') | Out-Null }
if ($commandState['gh']) {
    Invoke-VersionCheck 'version.gh' 'gh' @('--version') | Out-Null
    try {
        & gh auth status *> $null
        Add-Result -Id 'github.auth' -Status $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) -Message $(if ($LASTEXITCODE -eq 0) { 'GitHub CLI authentication is valid' } else { 'GitHub CLI is not authenticated' })
    }
    catch { Add-Result -Id 'github.auth' -Status FAIL -Message $_.Exception.Message }
}
if ($commandState['pwsh']) { Invoke-VersionCheck 'version.pwsh' 'pwsh' @('--version') | Out-Null }
if ($commandState['python']) { Invoke-VersionCheck 'version.python' 'python' @('--version') | Out-Null }
if ($commandState['uv']) { Invoke-VersionCheck 'version.uv' 'uv' @('--version') | Out-Null }
if ($commandState['node']) { Invoke-VersionCheck 'version.node' 'node' @('--version') | Out-Null }
if ($commandState['pnpm']) { Invoke-VersionCheck 'version.pnpm' 'pnpm' @('--version') | Out-Null }

# WSL and daemon isolation
if ($Mode -eq 'Ci') {
    Add-Skip 'wsl.version' 'WSL runtime check skipped in CI mode'
    Add-Skip 'wsl.workspace' 'WSL mount check skipped in CI mode'
    Add-Skip 'wsl.docker-daemon' 'WSL Docker daemon conflict check skipped in CI mode'
}
elseif ($commandState['wsl']) {
    try {
        $wslOutput = (& wsl -l -v 2>&1 | Out-String)
        $ok = $LASTEXITCODE -eq 0 -and $wslOutput -match '(?m)^\s*\*?\s*\S+\s+\S+\s+2\s*$'
        Add-Result -Id 'wsl.version' -Status $(if ($ok) { 'PASS' } else { 'FAIL' }) -Message $(if ($ok) { 'At least one WSL2 distribution was detected' } else { 'No distribution with VERSION 2 was detected' }) -Evidence $wslOutput.Trim()
    }
    catch { Add-Result -Id 'wsl.version' -Status FAIL -Message $_.Exception.Message }

    try {
        & wsl -e sh -lc "test -d /mnt/d/OPC && test -w /mnt/d/OPC/workspace" *> $null
        Add-Result -Id 'wsl.workspace' -Status $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) -Message $(if ($LASTEXITCODE -eq 0) { '/mnt/d/OPC is visible and writable' } else { '/mnt/d/OPC is missing or not writable' })
    }
    catch { Add-Result -Id 'wsl.workspace' -Status FAIL -Message $_.Exception.Message }

    try {
        $daemonCheck = & wsl -e sh -lc "if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet docker; then echo active; exit 10; else echo inactive; exit 0; fi" 2>&1 | Out-String
        if ($LASTEXITCODE -eq 10) {
            Add-Result -Id 'wsl.docker-daemon' -Status FAIL -Message 'A separate Docker daemon is active inside the default WSL distribution while Docker Desktop is expected' -Evidence $daemonCheck.Trim()
        }
        elseif ($LASTEXITCODE -eq 0) {
            Add-Result -Id 'wsl.docker-daemon' -Status PASS -Message 'No active standalone Docker daemon was detected inside the default WSL distribution' -Evidence $daemonCheck.Trim()
        }
        else {
            Add-Result -Id 'wsl.docker-daemon' -Status WARN -Message 'Could not conclusively determine Docker daemon state inside WSL' -Evidence $daemonCheck.Trim()
        }
    }
    catch { Add-Result -Id 'wsl.docker-daemon' -Status WARN -Message $_.Exception.Message }
}

# Docker and runtime
if ($Mode -eq 'Ci') {
    Add-Skip 'docker.engine' 'Docker Desktop check skipped in CI mode'
    Add-Skip 'docker.hello-world' 'Container smoke test skipped in CI mode'
    Add-Skip 'runtime.compose' 'Runtime health check skipped in CI mode'
}
elseif ($commandState['docker']) {
    try {
        $dockerInfo = & docker info 2>&1 | Out-String
        Add-Result -Id 'docker.engine' -Status $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) -Message $(if ($LASTEXITCODE -eq 0) { 'Docker engine is available' } else { 'Docker CLI exists but engine is unavailable' }) -Evidence $dockerInfo.Trim()
    }
    catch { Add-Result -Id 'docker.engine' -Status FAIL -Message $_.Exception.Message }

    try {
        & docker run --rm hello-world *> $null
        Add-Result -Id 'docker.hello-world' -Status $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) -Message $(if ($LASTEXITCODE -eq 0) { 'hello-world completed successfully' } else { 'hello-world failed' })
    }
    catch { Add-Result -Id 'docker.hello-world' -Status FAIL -Message $_.Exception.Message }

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
        catch { Add-Result -Id 'runtime.compose' -Status FAIL -Message $_.Exception.Message }
    }
    else {
        Add-Result -Id 'runtime.compose' -Status WARN -Message "Runtime compose file not found at $composePath"
    }
}

# Optional NVIDIA
if ($Mode -eq 'Ci' -or $SkipHardwareChecks) {
    Add-Skip 'gpu.nvidia' 'GPU check skipped by mode or parameter'
}
elseif (Get-Command 'nvidia-smi' -ErrorAction SilentlyContinue) {
    try {
        $gpuOutput = & nvidia-smi 2>&1 | Out-String
        Add-Result -Id 'gpu.nvidia' -Status $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) -Message $(if ($LASTEXITCODE -eq 0) { 'NVIDIA driver responds to nvidia-smi' } else { 'nvidia-smi failed' }) -Evidence $gpuOutput.Trim()
    }
    catch { Add-Result -Id 'gpu.nvidia' -Status FAIL -Message $_.Exception.Message }
}
else {
    Add-Result -Id 'gpu.nvidia' -Status SKIP -Message 'nvidia-smi is absent; valid only when this machine has no NVIDIA GPU'
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
if (-not $OutputJson) { $OutputJson = Join-Path $OutputDirectory "verification-$timestamp.json" }
if (-not $OutputMarkdown) { $OutputMarkdown = Join-Path $OutputDirectory "verification-$timestamp.md" }

foreach ($path in @($OutputJson,$OutputMarkdown)) {
    $parent = Split-Path -Parent $path
    if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
}

$passCount = @($Results | Where-Object Status -eq 'PASS').Count
$warnCount = @($Results | Where-Object Status -eq 'WARN').Count
$failCount = @($Results | Where-Object Status -eq 'FAIL').Count
$skipCount = @($Results | Where-Object Status -eq 'SKIP').Count
$overall = if ($failCount -gt 0) { 'FAIL' } elseif ($FailOnSkip -and $skipCount -gt 0) { 'FAIL' } elseif ($warnCount -gt 0 -or $skipCount -gt 0) { 'CONDITIONAL' } else { 'PASS' }

$report = [ordered]@{
    schema_version = 3
    run_id = $RunId
    host = [ordered]@{
        computer_name = $env:COMPUTERNAME
        powershell = $PSVersionTable.PSVersion.ToString()
        mode = $Mode
        workspace_root = $WorkspaceRoot
        runtime_path = $RuntimePath
        expected_volume_unique_id = $ExpectedVolumeUniqueId
    }
    checks = $Results
    summary = [ordered]@{ pass=$passCount; warn=$warnCount; fail=$failCount; skip=$skipCount; overall=$overall }
}

$report | ConvertTo-Json -Depth 8 | Set-Content -Path $OutputJson -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# OPC Workstation Verification Report')
$lines.Add('')
$lines.Add("- Run ID: $RunId")
$lines.Add("- Host: $env:COMPUTERNAME")
$lines.Add("- PowerShell: $($PSVersionTable.PSVersion)")
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
