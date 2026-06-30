[CmdletBinding()]
param(
    [string]$WorkspaceRoot = 'D:\OPC',
    [string]$ExpectedVolumeLabel = 'OPC-DATA',
    [string]$OutputDirectory = 'D:\OPC\artifacts\verification'
)

$ErrorActionPreference = 'Continue'
$Results = [System.Collections.Generic.List[object]]::new()

function Add-Result {
    param(
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][ValidateSet('PASS','WARN','FAIL','SKIP')][string]$Status,
        [Parameter(Mandatory)][string]$Message
    )

    $Results.Add([pscustomobject]@{
        Id = $Id
        Status = $Status
        Message = $Message
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
        Add-Result "command.$Name" PASS "$Name is available at $($command.Source)"
        return $true
    }

    $status = if ($Required) { 'FAIL' } else { 'WARN' }
    Add-Result "command.$Name" $status "$Name is not available"
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
            Add-Result $Id PASS (($output.Trim() -split "`r?`n")[0])
            return $true
        }
        $status = if ($Required) { 'FAIL' } else { 'WARN' }
        Add-Result $Id $status ($output.Trim())
    }
    catch {
        $status = if ($Required) { 'FAIL' } else { 'WARN' }
        Add-Result $Id $status $_.Exception.Message
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

# Windows
try {
    $os = Get-CimInstance Win32_OperatingSystem -ErrorAction Stop
    if ($os.Caption -match 'Windows 11') {
        Add-Result 'windows.version' PASS "$($os.Caption) build $($os.BuildNumber)"
    }
    else {
        Add-Result 'windows.version' FAIL "Expected Windows 11, found $($os.Caption)"
    }
}
catch {
    Add-Result 'windows.version' FAIL $_.Exception.Message
}

try {
    $secureBoot = Confirm-SecureBootUEFI -ErrorAction Stop
    Add-Result 'windows.secure-boot' $(if ($secureBoot) { 'PASS' } else { 'FAIL' }) "Secure Boot: $secureBoot"
}
catch {
    Add-Result 'windows.secure-boot' FAIL $_.Exception.Message
}

try {
    $tpm = Get-Tpm -ErrorAction Stop
    if ($tpm.TpmPresent -and $tpm.TpmReady) {
        Add-Result 'windows.tpm' PASS 'TPM is present and ready'
    }
    else {
        Add-Result 'windows.tpm' FAIL "TpmPresent=$($tpm.TpmPresent), TpmReady=$($tpm.TpmReady)"
    }
}
catch {
    Add-Result 'windows.tpm' FAIL $_.Exception.Message
}

try {
    $defender = Get-MpComputerStatus -ErrorAction Stop
    if ($defender.AntivirusEnabled -and $defender.RealTimeProtectionEnabled) {
        Add-Result 'windows.defender' PASS 'Defender antivirus and real-time protection are enabled'
    }
    else {
        Add-Result 'windows.defender' FAIL "AntivirusEnabled=$($defender.AntivirusEnabled), RealTimeProtectionEnabled=$($defender.RealTimeProtectionEnabled)"
    }
}
catch {
    Add-Result 'windows.defender' WARN $_.Exception.Message
}

# Storage
try {
    $volume = Get-Volume -DriveLetter D -ErrorAction Stop
    if ($volume.FileSystem -eq 'NTFS' -and $volume.FileSystemLabel -eq $ExpectedVolumeLabel -and $volume.HealthStatus -eq 'Healthy') {
        Add-Result 'storage.opc-data' PASS "D: is NTFS, Healthy, labeled $ExpectedVolumeLabel"
    }
    else {
        Add-Result 'storage.opc-data' FAIL "D: filesystem=$($volume.FileSystem), label=$($volume.FileSystemLabel), health=$($volume.HealthStatus)"
    }

    $freePercent = [math]::Round(($volume.SizeRemaining / $volume.Size) * 100, 1)
    if ($freePercent -ge 20) {
        Add-Result 'storage.free-space' PASS "D: free space is $freePercent%"
    }
    elseif ($freePercent -ge 10) {
        Add-Result 'storage.free-space' WARN "D: free space is only $freePercent%"
    }
    else {
        Add-Result 'storage.free-space' FAIL "D: free space is critically low at $freePercent%"
    }
}
catch {
    Add-Result 'storage.opc-data' FAIL $_.Exception.Message
}

$requiredDirectories = @('projects','workspace','runtime','artifacts','knowledge','models','logs','sandbox','config','secrets','backups','tools')
if (Test-Path $WorkspaceRoot -PathType Container) {
    Add-Result 'workspace.root' PASS "$WorkspaceRoot exists"
    foreach ($directory in $requiredDirectories) {
        $path = Join-Path $WorkspaceRoot $directory
        if (Test-Path $path -PathType Container) {
            Add-Result "workspace.$directory" PASS "$path exists"
        }
        else {
            Add-Result "workspace.$directory" FAIL "$path is missing"
        }
    }
}
else {
    Add-Result 'workspace.root' FAIL "$WorkspaceRoot does not exist"
}

$markerPath = Join-Path $WorkspaceRoot '.opc-workspace.json'
if (Test-Path $markerPath -PathType Leaf) {
    Add-Result 'workspace.marker' PASS "$markerPath exists"
}
else {
    Add-Result 'workspace.marker' WARN 'Workspace marker is missing; rerun bootstrap after verifying D:'
}

# Development commands
$commandState = @{}
foreach ($command in @('git','gh','code','pwsh','python','uv','node','pnpm','wsl','docker')) {
    $commandState[$command] = Test-CommandAvailable -Name $command -Required $true
}

if ($commandState['git']) { Invoke-VersionCheck -Id 'version.git' -Command 'git' -Arguments @('--version') | Out-Null }
if ($commandState['gh']) {
    Invoke-VersionCheck -Id 'version.gh' -Command 'gh' -Arguments @('--version') | Out-Null
    try {
        & gh auth status *> $null
        Add-Result 'github.auth' $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) $(if ($LASTEXITCODE -eq 0) { 'GitHub CLI authentication is valid' } else { 'GitHub CLI is not authenticated' })
    }
    catch {
        Add-Result 'github.auth' FAIL $_.Exception.Message
    }
}
if ($commandState['pwsh']) { Invoke-VersionCheck -Id 'version.pwsh' -Command 'pwsh' -Arguments @('--version') | Out-Null }
if ($commandState['python']) { Invoke-VersionCheck -Id 'version.python' -Command 'python' -Arguments @('--version') | Out-Null }
if ($commandState['uv']) { Invoke-VersionCheck -Id 'version.uv' -Command 'uv' -Arguments @('--version') | Out-Null }
if ($commandState['node']) { Invoke-VersionCheck -Id 'version.node' -Command 'node' -Arguments @('--version') | Out-Null }
if ($commandState['pnpm']) { Invoke-VersionCheck -Id 'version.pnpm' -Command 'pnpm' -Arguments @('--version') | Out-Null }

# WSL2
if ($commandState['wsl']) {
    try {
        $wslOutput = (& wsl -l -v 2>&1 | Out-String)
        if ($LASTEXITCODE -ne 0) {
            Add-Result 'wsl.version' FAIL $wslOutput.Trim()
        }
        elseif ($wslOutput -match '(?m)^\s*\*?\s*\S+\s+\S+\s+2\s*$') {
            Add-Result 'wsl.version' PASS 'At least one WSL2 distribution was detected'
        }
        else {
            Add-Result 'wsl.version' FAIL 'No distribution with VERSION 2 was detected'
        }
    }
    catch {
        Add-Result 'wsl.version' FAIL $_.Exception.Message
    }

    try {
        & wsl -e sh -lc "test -d /mnt/d/OPC && test -w /mnt/d/OPC/workspace" *> $null
        Add-Result 'wsl.workspace' $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) $(if ($LASTEXITCODE -eq 0) { '/mnt/d/OPC is visible and workspace is writable' } else { '/mnt/d/OPC is missing or not writable' })
    }
    catch {
        Add-Result 'wsl.workspace' FAIL $_.Exception.Message
    }
}

# Docker
if ($commandState['docker']) {
    try {
        & docker info *> $null
        if ($LASTEXITCODE -eq 0) {
            Add-Result 'docker.engine' PASS 'Docker engine is available'
        }
        else {
            Add-Result 'docker.engine' FAIL 'Docker CLI exists but the engine is unavailable'
        }
    }
    catch {
        Add-Result 'docker.engine' FAIL $_.Exception.Message
    }

    try {
        & docker run --rm hello-world *> $null
        Add-Result 'docker.hello-world' $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) $(if ($LASTEXITCODE -eq 0) { 'hello-world container completed successfully' } else { 'hello-world container failed' })
    }
    catch {
        Add-Result 'docker.hello-world' FAIL $_.Exception.Message
    }
}

# NVIDIA is optional
if (Get-Command 'nvidia-smi' -ErrorAction SilentlyContinue) {
    try {
        & nvidia-smi *> $null
        Add-Result 'gpu.nvidia' $(if ($LASTEXITCODE -eq 0) { 'PASS' } else { 'FAIL' }) $(if ($LASTEXITCODE -eq 0) { 'NVIDIA driver responds to nvidia-smi' } else { 'nvidia-smi failed' })
    }
    catch {
        Add-Result 'gpu.nvidia' FAIL $_.Exception.Message
    }
}
else {
    Add-Result 'gpu.nvidia' SKIP 'nvidia-smi is not installed; skip if this machine has no NVIDIA GPU'
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$jsonPath = Join-Path $OutputDirectory "verification-$timestamp.json"
$mdPath = Join-Path $OutputDirectory "verification-$timestamp.md"

$Results | ConvertTo-Json -Depth 5 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = [System.Collections.Generic.List[string]]::new()
$lines.Add('# OPC Full Verification')
$lines.Add('')
$lines.Add("Generated: $(Get-Date -Format o)")
$lines.Add('')
$lines.Add('| Check | Status | Message |')
$lines.Add('|---|---|---|')
foreach ($result in $Results) {
    $message = ($result.Message -replace '\|','/' -replace "`r?`n",' ')
    $lines.Add("| $($result.Id) | $($result.Status) | $message |")
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

$passCount = @($Results | Where-Object Status -eq 'PASS').Count
$warnCount = @($Results | Where-Object Status -eq 'WARN').Count
$failCount = @($Results | Where-Object Status -eq 'FAIL').Count
$skipCount = @($Results | Where-Object Status -eq 'SKIP').Count

$Results | Format-Table Id,Status,Message -AutoSize
Write-Host ""
Write-Host "PASS: $passCount  WARN: $warnCount  FAIL: $failCount  SKIP: $skipCount"
Write-Host "JSON: $jsonPath"
Write-Host "Markdown: $mdPath"

if ($failCount -gt 0) { exit 1 }
exit 0
