$commands = @(
  "winget --version",
  "git --version",
  "gh --version",
  "code --version",
  "wsl --version",
  "docker --version"
)

foreach ($cmd in $commands) {
  Write-Host "Checking: $cmd"
  try {
    Invoke-Expression $cmd
    Write-Host "OK"
  } catch {
    Write-Host "FAILED: $cmd"
  }
}
