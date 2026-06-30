$ErrorActionPreference = "Stop"

$Root = "D:\OPC"
$Dirs = @(
  "projects",
  "knowledge",
  "artifacts",
  "runtime",
  "logs",
  "models",
  "sandbox",
  "backups",
  "config",
  "secrets"
)

Write-Host "Creating OPC workspace at $Root"
New-Item -ItemType Directory -Path $Root -Force | Out-Null

foreach ($d in $Dirs) {
  $Path = Join-Path $Root $d
  New-Item -ItemType Directory -Path $Path -Force | Out-Null
  Write-Host "OK: $Path"
}

Write-Host "OPC workspace bootstrap complete."
