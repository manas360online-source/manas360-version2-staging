$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$path = Join-Path $root 'frontend\src\pages\LandingPage.tsx'
$path = [System.IO.Path]::GetFullPath($path)

if (-not (Test-Path -LiteralPath $path)) {
  throw "LandingPage.tsx not found at: $path"
}

$text = Get-Content -LiteralPath $path -Raw

$pattern = '(?s)(aria-label="MANAS360 Home"[\s\S]*?\btop:\s*")\d+px(",)'
$updated = [regex]::Replace($text, $pattern, '${1}64px${2}', 1)

if ($updated -eq $text) {
  throw 'Logo anchor top style not updated (pattern mismatch).'
}

Set-Content -LiteralPath $path -Value $updated -Encoding utf8

Write-Output ("Updated: " + $path)
Write-Output '---'
Select-String -Path $path -Pattern 'aria-label="MANAS360 Home"|top: "64px"|top: "74px"' | Select-Object -First 10 | ForEach-Object { $_.ToString() } | Write-Output
