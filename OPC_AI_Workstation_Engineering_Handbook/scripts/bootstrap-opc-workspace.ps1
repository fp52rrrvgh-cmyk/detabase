[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [string]$Root = 'D:\OPC',
    [string]$ExpectedVolumeLabel = 'OPC-DATA'
)

$ErrorActionPreference = 'Stop'

$RequiredDirectories = @(
  'projects',
  'workspace',
  'knowledge',
  'artifacts',
  'runtime',
  'logs',
  'models',
  'sandbox',
  'backups',
  'config',
  'secrets',
  'tools'
)

function Fail($Message) {
    throw "[BOOTSTRAP-REFUSED] $Message"
}

if (-not ($Root -match '^[A-Z]:\\OPC$')) {
    Fail "Root must be a drive-root OPC path such as D:\OPC. Got: $Root"
}

$DriveLetter = $Root.Substring(0,1)

try {
    $Volume = Get-Volume -DriveLetter $DriveLetter -ErrorAction Stop
}
catch {
    Fail "Drive ${DriveLetter}: not found. Do not create OPC workspace on the wrong drive."
}

if ($Volume.FileSystem -ne 'NTFS') {
    Fail "Drive ${DriveLetter}: must be NTFS. Current filesystem: $($Volume.FileSystem)"
}

if ($Volume.FileSystemLabel -ne $ExpectedVolumeLabel) {
    Fail "Drive ${DriveLetter}: label must be $ExpectedVolumeLabel. Current label: $($Volume.FileSystemLabel)"
}

$MarkerPath = Join-Path $Root '.opc-workspace.json'

if (-not (Test-Path $Root)) {
    if ($PSCmdlet.ShouldProcess($Root, 'Create OPC workspace root')) {
        New-Item -ItemType Directory -Path $Root -Force | Out-Null
    }
}

foreach ($Directory in $RequiredDirectories) {
    $Path = Join-Path $Root $Directory
    if (-not (Test-Path $Path)) {
        if ($PSCmdlet.ShouldProcess($Path, 'Create OPC workspace directory')) {
            New-Item -ItemType Directory -Path $Path -Force | Out-Null
        }
    }
    Write-Host "OK: $Path"
}

if (-not (Test-Path $MarkerPath)) {
    $Marker = [ordered]@{
        schema_version = 1
        workspace = 'OPC'
        root = $Root
        volume_label = $ExpectedVolumeLabel
        created_at = (Get-Date).ToString('o')
    }

    if ($PSCmdlet.ShouldProcess($MarkerPath, 'Create workspace marker')) {
        $Marker | ConvertTo-Json -Depth 4 | Set-Content -Path $MarkerPath -Encoding UTF8
    }
}
else {
    Write-Host "OK: workspace marker exists: $MarkerPath"
}

Write-Host "OPC workspace bootstrap complete. No existing project data was deleted."
