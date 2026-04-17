$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$path = Join-Path $root 'frontend\src\pages\LandingPage.tsx'
$path = [System.IO.Path]::GetFullPath($path)

if (-not (Test-Path -LiteralPath $path)) {
  throw "LandingPage.tsx not found at: $path"
}

$text = Get-Content -LiteralPath $path -Raw

$newQuick = @"
  const quickNavItems: Array<{ icon: string; label: string }> = useMemo(
    () => [
      { icon: "\uD83E\uDD1D", label: "I Need a Helping Hand" },
      { icon: "\u26A1", label: "AI Power Hub" },
      { icon: "\uD83D\uDC3E", label: "Digital Pets4Happy Hormones" },
      { icon: "\uD83D\uDC8E", label: "Premium Therapy Hub" },
      { icon: "\uD83E\uDDF0", label: "Self-Help Tools" },
      { icon: "\u2728", label: "Find a Spark Again" },
      { icon: "\uD83C\uDFDB\uFE0F", label: "For Corporates / Edu / Healthcare" },
      { icon: "\uD83C\uDF93", label: "Certify2EarnMore" },
      { icon: "\uD83D\uDCCB", label: "MyDigitalClinic" }
    ],
    []
  );
"@

$quickPattern = '(?s)(\r?\n)\s*const quickNavItems: Array<\{ icon: string; label: string \}> = useMemo\(\s*\(\) => \[\s*.*?\s*\],\s*\[\]\s*\);'

$updated = [regex]::Replace($text, $quickPattern, ('$1' + $newQuick.TrimEnd()))
if ($updated -eq $text) {
  throw 'quickNavItems block not replaced (pattern mismatch).'
}
$text = $updated

$oldQuickNavDiv = '<div className="quick-nav" style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "nowrap" }}>'
$newQuickNavDiv = '<div className="quick-nav" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap", flex: 1, minWidth: 0, maxWidth: "100%" }}>'

if ($text.Contains($oldQuickNavDiv)) {
  $text = $text.Replace($oldQuickNavDiv, $newQuickNavDiv)
}

$text = $text.Replace('fontSize: "clamp(10px, 1.0vw, 12px)",', 'fontSize: "clamp(9px, 0.85vw, 11px)",')
$text = $text.Replace('padding: "6px 10px",', 'padding: "4px 8px",')
$text = $text.Replace('fontSize: "clamp(12px, 1.1vw, 14px)"', 'fontSize: "clamp(11px, 1.0vw, 13px)"')

$cssPattern = '(?s)\.quick-nav\s*\{\s*flex-wrap:\s*nowrap;\s*overflow-x:\s*auto;\s*overflow-y:\s*hidden;\s*-ms-overflow-style:\s*none;\s*scrollbar-width:\s*none;\s*\}'
$text = [regex]::Replace(
  $text,
  $cssPattern,
  '.quick-nav {
                  flex-wrap: nowrap;
                  white-space: nowrap;
                  width: 100%;
                  max-width: 100%;
                  min-width: 0;
                  overflow-x: auto;
                  overflow-y: hidden;
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }'
)

Set-Content -LiteralPath $path -Value $text -Encoding utf8

Write-Output ("Updated: " + $path)
Write-Output '---'
(Get-Item $path | Select-Object LastWriteTime,Length | Format-List | Out-String).Trim() | Write-Output
Write-Output '---'
Select-String -Path $path -Pattern 'I Need a Helping Hand|AI Power Hub|Digital Pets4Happy Hormones|Premium Therapy Hub|Self-Help Tools|Find a Spark Again|For Corporates / Edu / Healthcare|Certify2EarnMore|MyDigitalClinic' | Select-Object -First 50 | ForEach-Object { $_.Line.Trim() } | Write-Output
