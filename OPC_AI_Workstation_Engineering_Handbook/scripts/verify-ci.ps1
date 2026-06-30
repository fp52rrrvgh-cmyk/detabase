#requires -Version 7.4
[CmdletBinding()]
param(
    [string]$HandbookRoot = (Split-Path $PSScriptRoot -Parent),
    [string]$OutputJson,
    [string]$OutputMarkdown
)

$ErrorActionPreference = 'Stop'
$results = [System.Collections.Generic.List[object]]::new()

function Add-Check {
    param([string]$Id,[string]$Status,[string]$Message)
    $results.Add([pscustomobject]@{ id=$Id; status=$Status; message=$Message })
}

$requiredFiles = @(
    'scripts/bootstrap.ps1',
    'scripts/bootstrap-opc-workspace.ps1',
    'scripts/verify-all.ps1',
    'scripts/opc-control.ps1',
    'templates/opc-core-compose.yaml',
    '11-Final/01-Master-Index.md',
    '11-Final/03-Full-System-Acceptance.md'
)

foreach ($relative in $requiredFiles) {
    $path = Join-Path $HandbookRoot $relative
    Add-Check "file.$relative" $(if (Test-Path $path -PathType Leaf) { 'PASS' } else { 'FAIL' }) $(if (Test-Path $path -PathType Leaf) { 'exists' } else { 'missing' })
}

Get-ChildItem (Join-Path $HandbookRoot 'scripts') -Filter '*.ps1' -Recurse | ForEach-Object {
    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile($_.FullName,[ref]$tokens,[ref]$errors) | Out-Null
    if ($errors.Count -eq 0) {
        Add-Check "syntax.$($_.Name)" PASS 'PowerShell syntax valid'
    }
    else {
        Add-Check "syntax.$($_.Name)" FAIL (($errors.Message -join '; '))
    }
}

$composePath = Join-Path $HandbookRoot 'templates/opc-core-compose.yaml'
if (Test-Path $composePath) {
    $compose = Get-Content $composePath -Raw
    foreach ($needle in @('services:','postgres:','redis:','healthcheck:','postgres_data:','redis_data:')) {
        Add-Check "compose.$needle" $(if ($compose.Contains($needle)) { 'PASS' } else { 'FAIL' }) $(if ($compose.Contains($needle)) { 'present' } else { 'missing' })
    }
}

$fail = @($results | Where-Object status -eq 'FAIL').Count
$pass = @($results | Where-Object status -eq 'PASS').Count
$overall = if ($fail -gt 0) { 'FAIL' } else { 'PASS' }

if (-not $OutputJson) { $OutputJson = Join-Path $HandbookRoot 'artifacts\verification\verification-ci.json' }
if (-not $OutputMarkdown) { $OutputMarkdown = Join-Path $HandbookRoot 'artifacts\verification\verification-ci.md' }

foreach ($path in @($OutputJson,$OutputMarkdown)) {
    New-Item -ItemType Directory -Path (Split-Path $path -Parent) -Force | Out-Null
}

[ordered]@{
    schema_version = 1
    mode = 'ci'
    generated_at = (Get-Date).ToString('o')
    host = $env:COMPUTERNAME
    checks = $results
    summary = [ordered]@{ pass=$pass; fail=$fail; overall=$overall }
} | ConvertTo-Json -Depth 6 | Set-Content $OutputJson -Encoding UTF8

$lines = @(
    '# OPC Handbook CI Verification',
    '',
    "- Generated: $((Get-Date).ToString('o'))",
    "- Host: $env:COMPUTERNAME",
    "- Overall: **$overall**",
    '',
    '| Check | Status | Message |',
    '|---|---|---|'
)
foreach ($result in $results) {
    $lines += "| $($result.id) | $($result.status) | $($result.message -replace '\|','/') |"
}
$lines += ''
$lines += "PASS: $pass  FAIL: $fail"
$lines | Set-Content $OutputMarkdown -Encoding UTF8

$results | Format-Table -AutoSize
Write-Host "OVERALL: $overall"
Write-Host "JSON: $OutputJson"
Write-Host "Markdown: $OutputMarkdown"

if ($fail -gt 0) { exit 1 }
exit 0
