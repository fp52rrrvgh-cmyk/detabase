[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('Start','Stop','Pause','Resume','Status')]
    [string]$Action,

    [string]$RuntimePath = 'D:\OPC\runtime\opc-core'
)

$ErrorActionPreference = 'Stop'

function Assert-RuntimePath {
    if (-not (Test-Path $RuntimePath)) {
        throw "Runtime path not found: $RuntimePath"
    }
    if (-not (Test-Path (Join-Path $RuntimePath 'compose.yaml'))) {
        throw "compose.yaml not found in $RuntimePath"
    }
}

function Invoke-Compose {
    param([string[]]$Arguments)
    Push-Location $RuntimePath
    try {
        & docker compose @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "docker compose failed: $($Arguments -join ' ')"
        }
    }
    finally {
        Pop-Location
    }
}

Assert-RuntimePath

switch ($Action) {
    'Start' {
        Invoke-Compose @('up','-d')
        Invoke-Compose @('ps')
    }
    'Stop' {
        Write-Warning 'Confirm running tasks are checkpointed before stopping.'
        Invoke-Compose @('stop')
    }
    'Pause' {
        $marker = 'D:\OPC\runtime\PAUSED'
        New-Item -ItemType File -Path $marker -Force | Out-Null
        Write-Host "Dispatch pause marker created: $marker"
    }
    'Resume' {
        $marker = 'D:\OPC\runtime\PAUSED'
        if (Test-Path $marker) {
            Remove-Item $marker -Force
        }
        Write-Host 'Dispatch pause marker removed.'
    }
    'Status' {
        Invoke-Compose @('ps')
        $paused = Test-Path 'D:\OPC\runtime\PAUSED'
        Write-Host "Paused: $paused"
    }
}
