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

function Resolve-HandbookPath {
    param([string]$BaseDirectory,[string]$Reference)

    $clean = $Reference.Trim()
    $clean = $clean -replace '#.*$',''
    $clean = [uri]::UnescapeDataString($clean)
    if ([string]::IsNullOrWhiteSpace($clean)) { return $null }

    if ([System.IO.Path]::IsPathRooted($clean)) {
        return [System.IO.Path]::GetFullPath($clean)
    }

    return [System.IO.Path]::GetFullPath((Join-Path $BaseDirectory $clean))
}

$requiredFiles = @(
    'scripts/bootstrap.ps1',
    'scripts/bootstrap-opc-workspace.ps1',
    'scripts/verify-all.ps1',
    'scripts/verify-ci.ps1',
    'scripts/opc-control.ps1',
    'templates/opc-core-compose.yaml',
    '11-Final/01-Master-Index.md',
    '11-Final/03-Full-System-Acceptance.md',
    '11-Final/04-Completion-Record.md',
    '11-Final/05-Phase-1-Release-and-Phase-2-Handoff.md'
)

foreach ($relative in $requiredFiles) {
    $path = Join-Path $HandbookRoot $relative
    $exists = Test-Path $path -PathType Leaf
    Add-Check "file.$relative" $(if ($exists) { 'PASS' } else { 'FAIL' }) $(if ($exists) { 'exists' } else { 'missing' })
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
        $present = $compose.Contains($needle)
        Add-Check "compose.$needle" $(if ($present) { 'PASS' } else { 'FAIL' }) $(if ($present) { 'present' } else { 'missing' })
    }
}

$masterIndexPath = Join-Path $HandbookRoot '11-Final/01-Master-Index.md'
if (Test-Path $masterIndexPath) {
    $masterIndex = Get-Content $masterIndexPath -Raw
    $referencePattern = '(?m)^\s*(?<path>(?:\d{2}-[A-Za-z0-9-]+/)?[A-Za-z0-9_.-]+\.(?:md|ps1|ya?ml))\s*$'
    $masterReferences = [regex]::Matches($masterIndex,$referencePattern) |
        ForEach-Object { $_.Groups['path'].Value } |
        Sort-Object -Unique

    foreach ($reference in $masterReferences) {
        $resolved = Resolve-HandbookPath -BaseDirectory $HandbookRoot -Reference $reference
        $exists = $resolved -and (Test-Path $resolved -PathType Leaf)
        Add-Check "master-index.$reference" $(if ($exists) { 'PASS' } else { 'FAIL' }) $(if ($exists) { 'reference resolves' } else { "missing reference: $reference" })
    }
}

Get-ChildItem $HandbookRoot -Filter '*.md' -Recurse | ForEach-Object {
    $markdownFile = $_
    $content = Get-Content $markdownFile.FullName -Raw
    $linkPattern = '\[[^\]]*\]\((?<target>[^)]+)\)'

    foreach ($match in [regex]::Matches($content,$linkPattern)) {
        $target = $match.Groups['target'].Value.Trim()
        if ($target -match '^(?:https?://|mailto:|#)') { continue }
        if ($target -match '^<.*>$') { $target = $target.Trim('<','>') }

        $resolved = Resolve-HandbookPath -BaseDirectory $markdownFile.DirectoryName -Reference $target
        $relativeSource = [System.IO.Path]::GetRelativePath($HandbookRoot,$markdownFile.FullName)
        $checkId = "link.$relativeSource->$target"
        $exists = $resolved -and (Test-Path $resolved)
        Add-Check $checkId $(if ($exists) { 'PASS' } else { 'FAIL' }) $(if ($exists) { 'local link resolves' } else { 'broken local link' })
    }
}

# Prevent stale directory names from reappearing in the current handbook.
$legacyReferences = @(
    '05-WSL2/',
    '06-Docker/',
    '07-Bootstrap/',
    '08-Runtime/'
)

$allMarkdown = Get-ChildItem $HandbookRoot -Filter '*.md' -Recurse | ForEach-Object {
    [pscustomobject]@{ Path=$_.FullName; Content=(Get-Content $_.FullName -Raw) }
}

foreach ($legacy in $legacyReferences) {
    $hits = @($allMarkdown | Where-Object { $_.Content.Contains($legacy) })
    Add-Check "legacy-reference.$legacy" $(if ($hits.Count -eq 0) { 'PASS' } else { 'FAIL' }) $(if ($hits.Count -eq 0) { 'not present' } else { "found in $($hits.Count) file(s)" })
}

# The root finance spec must never become the OPC Runtime source of truth.
$financeSpecMentions = @($allMarkdown | Where-Object {
    $_.Content -match 'spec-phase2\.md' -and
    $_.Path -notmatch '05-Phase-1-Release-and-Phase-2-Handoff\.md$' -and
    $_.Path -notmatch '04-Completion-Record\.md$' -and
    $_.Path -notmatch '03-Full-System-Acceptance\.md$'
})
Add-Check 'phase2.finance-spec-boundary' $(if ($financeSpecMentions.Count -eq 0) { 'PASS' } else { 'FAIL' }) $(if ($financeSpecMentions.Count -eq 0) { 'finance spec is not used as OPC Phase 2 source' } else { 'unexpected spec-phase2.md reference found' })

$fail = @($results | Where-Object status -eq 'FAIL').Count
$pass = @($results | Where-Object status -eq 'PASS').Count
$overall = if ($fail -gt 0) { 'FAIL' } else { 'PASS' }

if (-not $OutputJson) { $OutputJson = Join-Path $HandbookRoot 'artifacts\verification\verification-ci.json' }
if (-not $OutputMarkdown) { $OutputMarkdown = Join-Path $HandbookRoot 'artifacts\verification\verification-ci.md' }

foreach ($path in @($OutputJson,$OutputMarkdown)) {
    New-Item -ItemType Directory -Path (Split-Path $path -Parent) -Force | Out-Null
}

[ordered]@{
    schema_version = 3
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
    $lines += "| $($result.id -replace '\|','/') | $($result.status) | $($result.message -replace '\|','/') |"
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
