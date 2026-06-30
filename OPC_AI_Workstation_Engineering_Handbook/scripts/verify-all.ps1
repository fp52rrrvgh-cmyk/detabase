[CmdletBinding()]
param(
    [string]$OutputDirectory = 'D:\OPC\artifacts\verification'
)

$ErrorActionPreference = 'Continue'
$Results = @()

function Add-Result {
    param(
        [string]$Id,
        [ValidateSet('PASS','WARN','FAIL','SKIP')]
        [string]$Status,
        [string]$Message
    )

    $script:Results += [pscustomobject]@{
        Id = $Id
        Status = $Status
        Message = $Message
        Timestamp = (Get-Date).ToString('o')
    }
}

function Test-Command {
    param([string]$Name)
    if (Get-Command $Name -ErrorAction SilentlyContinue) {
        Add-Result "command.$Name" PASS "$Name is available"
    }
    else {
        Add-Result "command.$Name" FAIL "$Name is not available"
    }
}

New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

try {
    $volume = Get-Volume -DriveLetter D -ErrorAction Stop
    if ($volume.FileSystem -eq 'NTFS' -and $volume.FileSystemLabel -eq 'OPC-DATA') {
        Add-Result 'storage.opc-data' PASS 'D: is NTFS and labeled OPC-DATA'
    }
    else {
        Add-Result 'storage.opc-data' FAIL "Unexpected D: configuration: $($volume.FileSystem), $($volume.FileSystemLabel)"
    }
}
catch {
    Add-Result 'storage.opc-data' FAIL $_.Exception.Message
}

if (Test-Path 'D:\OPC\.opc-workspace.json') {
    Add-Result 'workspace.marker' PASS 'Workspace marker exists'
}
else {
    Add-Result 'workspace.marker' WARN 'Workspace marker is missing'
}

'git','gh','code','pwsh','wsl','docker' | ForEach-Object { Test-Command $_ }

try {
    $wslOutput = (& wsl -l -v 2>&1 | Out-String)
    if ($wslOutput -match '2') {
        Add-Result 'wsl.version' PASS 'A WSL2 distribution was detected'
    }
    else {
        Add-Result 'wsl.version' FAIL 'No WSL2 distribution detected'
    }
}
catch {
    Add-Result 'wsl.version' FAIL $_.Exception.Message
}

try {
    & docker info *> $null
    if ($LASTEXITCODE -eq 0) {
        Add-Result 'docker.engine' PASS 'Docker engine is available'
    }
    else {
        Add-Result 'docker.engine' FAIL 'Docker engine is unavailable'
    }
}
catch {
    Add-Result 'docker.engine' FAIL $_.Exception.Message
}

$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$jsonPath = Join-Path $OutputDirectory "verification-$timestamp.json"
$mdPath = Join-Path $OutputDirectory "verification-$timestamp.md"

$Results | ConvertTo-Json -Depth 4 | Set-Content -Path $jsonPath -Encoding UTF8

$lines = @('# OPC Full Verification','',"Generated: $(Get-Date -Format o)",'','| Check | Status | Message |','|---|---|---|')
foreach ($result in $Results) {
    $message = $result.Message -replace '\|','/'
    $lines += "| $($result.Id) | $($result.Status) | $message |"
}
$lines | Set-Content -Path $mdPath -Encoding UTF8

$failCount = @($Results | Where-Object Status -eq 'FAIL').Count
Write-Host "JSON: $jsonPath"
Write-Host "Markdown: $mdPath"
Write-Host "Failures: $failCount"

if ($failCount -gt 0) { exit 1 }
exit 0
