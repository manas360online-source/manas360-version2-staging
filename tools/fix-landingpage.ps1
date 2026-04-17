$ErrorActionPreference = 'Stop'

$path = Join-Path $PSScriptRoot '..\frontend\src\pages\LandingPage.tsx'
$path = [System.IO.Path]::GetFullPath($path)

if (-not (Test-Path -LiteralPath $path)) {
  throw "LandingPage.tsx not found at: $path"
}

function Replace-OrThrow {
  param(
    [Parameter(Mandatory = $true)][string]$Label,
    [Parameter(Mandatory = $true)][string]$Old,
    [Parameter(Mandatory = $true)][string]$New,
    [Parameter(Mandatory = $false)][int]$MaxCount = 0
  )

  if (-not $script:text.Contains($Old)) {
    if ($script:text.Contains($New)) {
      return
    }
    throw "Missing pattern for $Label"
  }

  if ($MaxCount -gt 0) {
    $count = ([regex]::Matches($script:text, [regex]::Escape($Old))).Count
    if ($count -gt $MaxCount) {
      throw "Pattern for $Label appears $count times (max $MaxCount)"
    }
  }

  $script:text = $script:text.Replace($Old, $New)
}

$script:text = [System.IO.File]::ReadAllText($path)
$replacementChar = [char]0xFFFD

# Core types and labels
Replace-OrThrow -Label 'Language union' -Old 'type Language = "English" | "?????" | "?????" | "??????" | "?????";' -New 'type Language = "English" | "Hindi" | "Kannada" | "Tamil" | "Telugu";'
Replace-OrThrow -Label 'Language options list' -Old '{(["English", "?????", "?????", "??????", "?????"] as const).map((lang) => {' -New '{(["English", "Hindi", "Kannada", "Tamil", "Telugu"] as const).map((lang) => {'

# Visible placeholder cleanup
Replace-OrThrow -Label 'Promo Sixer icon' -Old '<span style={{ opacity: 0.95 }}>??</span>' -New '<span style={{ opacity: 0.95 }}>&#127951;</span>'
Replace-OrThrow -Label 'Chat button icon' -Old '<span style={{ fontSize: "26px" }}>??</span>' -New '<span style={{ fontSize: "26px" }}>&#128172;</span>'
Replace-OrThrow -Label 'Search button icon' -Old '<span style={{ fontSize: "14px" }}>??</span>' -New '<span style={{ fontSize: "14px" }}>&#128270;</span>'
Replace-OrThrow -Label 'Social chips' -Old '{["??", "??", "in"].map((s) => (' -New '{["wa", "ig", "in"].map((s) => ('

Replace-OrThrow -Label 'Left dock mini icon list' -Old '{["??", "??", "??", "divider-1", "???", "??", "divider-2", "??", "??"].map((item) => {' -New '{["\u26A1", "\uD83D\uDCAC", "\uD83E\uDDF0", "divider-1", "\uD83D\uDCC5", "\uD83D\uDCAC", "divider-2", "\uD83D\uDD0E", "\u2728"].map((item) => {'

Replace-OrThrow -Label 'Right avatar placeholders' -Old (
'          { bg: "#111827", image: "/HitASixer.jpeg", label: "Cricket" },' + "`r`n" +
'          { bg: "#FFF", label: "??" },' + "`r`n" +
'          { bg: "#FFF", label: "??" }'
) -New (
'          { bg: "#111827", image: "/HitASixer.jpeg", label: "Cricket" },' + "`r`n" +
'          { bg: "#FFF", label: "\uD83E\uDD16" },' + "`r`n" +
'          { bg: "#FFF", label: "\u2728" }'
)

if ($script:text.Contains("type LiveCard = {`r`n  title: string;")) {
  Replace-OrThrow -Label 'LiveCard.icon field' -Old ("type LiveCard = {`r`n  title: string;") -New ("type LiveCard = {`r`n  icon: string;`r`n  title: string;")
}

# Login icons (use JS unicode escapes; keep this script ASCII-only)
Replace-OrThrow -Label 'Login Patient icon' -Old '{ type: "patient", label: "Patient", icon: "??", desc: "Find therapy & healing" }' -New '{ type: "patient", label: "Patient", icon: "\uD83E\uDDD1", desc: "Find therapy & healing" }'
Replace-OrThrow -Label 'Login Therapist icon' -Old '{ type: "therapist", label: "Therapist", icon: "?????", desc: "Join & earn" }' -New '{ type: "therapist", label: "Therapist", icon: "\u2695\uFE0F", desc: "Join & earn" }'
Replace-OrThrow -Label 'Login Corporate icon' -Old '{ type: "corporate", label: "Corporate", icon: "??", desc: "Wellness programs" }' -New '{ type: "corporate", label: "Corporate", icon: "\uD83C\uDFE2", desc: "Wellness programs" }'
Replace-OrThrow -Label 'Login Clinic icon' -Old '{ type: "clinic", label: "Clinic", icon: "??", desc: "Manage practice" }' -New '{ type: "clinic", label: "Clinic", icon: "\uD83C\uDFE5", desc: "Manage practice" }'

# Quick nav icons
Replace-OrThrow -Label 'QuickNav Helping' -Old '{ icon: "??", label: "I Need a Helping Hand" }' -New '{ icon: "\uD83E\uDD1D", label: "I Need a Helping Hand" }'
Replace-OrThrow -Label 'QuickNav AI' -Old '{ icon: "??", label: "AI Power Hub" }' -New '{ icon: "\u26A1", label: "AI Power Hub" }'
Replace-OrThrow -Label 'QuickNav Pets' -Old '{ icon: "??", label: "Digital Pets4Happy Hormones" }' -New '{ icon: "\uD83D\uDC3E", label: "Digital Pets4Happy Hormones" }'
Replace-OrThrow -Label 'QuickNav Premium' -Old '{ icon: "?", label: "Premium Therapy Hub" }' -New '{ icon: "\uD83D\uDC8E", label: "Premium Therapy Hub" }'
Replace-OrThrow -Label 'QuickNav Tools' -Old '{ icon: "??", label: "Self-Help Tools" }' -New '{ icon: "\uD83E\uDDF0", label: "Self-Help Tools" }'
Replace-OrThrow -Label 'QuickNav Spark' -Old '{ icon: "??", label: "Find a Spark Again" }' -New '{ icon: "\u2728", label: "Find a Spark Again" }'
Replace-OrThrow -Label 'QuickNav Corporates' -Old '{ icon: "??", label: "For Corporates / Edu / Healthcare" }' -New '{ icon: "\uD83C\uDFDB\uFE0F", label: "For Corporates / Edu / Healthcare" }'
Replace-OrThrow -Label 'QuickNav Certify' -Old '{ icon: "??", label: "Certify" }' -New '{ icon: "\uD83C\uDF93", label: "Certify" }'

# Live cards button text (use JS unicode escape)
Replace-OrThrow -Label 'Join now arrow' -Old ("JOIN NOW $replacementChar FREE") -New 'JOIN NOW \u2192 FREE'
Replace-OrThrow -Label 'Join starting soon arrow' -Old ("JOIN $replacementChar Starting Soon") -New 'JOIN \u2192 Starting Soon'

# Inject live card icons (JS unicode escapes)
if ($script:text.Contains("{`r`n        title: ""Anxiety Circle""")) {
  Replace-OrThrow -Label 'Inject Anxiety icon' -Old "{`r`n        title: ""Anxiety Circle""" -New "{`r`n        icon: ""\\uD83E\\uDDE0"",`r`n        title: ""Anxiety Circle"""
}
if ($script:text.Contains("{`r`n        title: ""Grief & Loss""")) {
  Replace-OrThrow -Label 'Inject Grief icon' -Old "{`r`n        title: ""Grief & Loss""" -New "{`r`n        icon: ""\\uD83D\\uDD6F\\uFE0F"",`r`n        title: ""Grief & Loss"""
}
if ($script:text.Contains("{`r`n        title: ""Mindful Parenting""")) {
  Replace-OrThrow -Label 'Inject Parenting icon' -Old "{`r`n        title: ""Mindful Parenting""" -New "{`r`n        icon: ""\\uD83C\\uDF3F"",`r`n        title: ""Mindful Parenting"""
}

# Live schedule fixes (use &rarr; for JSX text)
Replace-OrThrow -Label 'Schedule arrow' -Old 'View full schedule ?' -New 'View full schedule &rarr;'
Replace-OrThrow -Label 'LiveCard icon render' -Old '                    ?????' -New '                    {card.icon}'
$oldLiveDot = '<span style={{ fontSize: "11px", fontWeight: 800, opacity: 0.8 }}>' + $replacementChar + '</span>'
if ($script:text.Contains($oldLiveDot)) {
  Replace-OrThrow -Label 'LiveCard separator dot' -Old $oldLiveDot -New '<span style={{ fontSize: "11px", fontWeight: 800, opacity: 0.8 }}>&bull;</span>'
}

# Top promo and CTA (use numeric entities in JSX)
Replace-OrThrow -Label 'Claim rupee/bolt' -Old 'CLAIM ?70 CREDIT ?' -New 'CLAIM &#8377;70 CREDIT &#9889;'
Replace-OrThrow -Label 'Close aria-label indent' -Old "onClick={() => setShowTopPromo(false)}`r`n      aria-label=""Close""" -New "onClick={() => setShowTopPromo(false)}`r`n              aria-label=""Close"""
Replace-OrThrow -Label 'Close glyph' -Old ("`r`n              " + $replacementChar + "`r`n            </button>") -New "`r`n              &times;`r`n            </button>"

Replace-OrThrow -Label 'Hero CTA arrow' -Old 'START FREE SCREENING ?' -New 'START FREE SCREENING &rarr;'

# Assessment section text and icons
Replace-OrThrow -Label 'Assessment em dash 1' -Old ("free assessment</em> " + $replacementChar + " your way.") -New 'free assessment</em> &mdash; your way.'
Replace-OrThrow -Label 'Assessment em dash 2' -Old ("results instantly " + $replacementChar + " no signup,") -New 'results instantly &mdash; no signup,'

$oldInAppIcon = '<span style={{ fontSize: "32px" }}>??</span>' + "`r`n" + '                <div>' + "`r`n" + '                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1A2E", marginBottom: "2px" }}>In-App Check-In</div>'
if ($script:text.Contains($oldInAppIcon)) {
  Replace-OrThrow -Label 'In-app icon' -Old $oldInAppIcon -New ('<span style={{ fontSize: "32px" }}>\uD83D\uDCF1</span>' + "`r`n" + '                <div>' + "`r`n" + '                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1A2E", marginBottom: "2px" }}>In-App Check-In</div>')
}

$oldWhatsAppIcon = '<span style={{ fontSize: "32px" }}>??</span>' + "`r`n" + '                <div>' + "`r`n" + '                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1A2E", marginBottom: "2px" }}>WhatsApp Assessment</div>'
if ($script:text.Contains($oldWhatsAppIcon)) {
  Replace-OrThrow -Label 'WhatsApp icon' -Old $oldWhatsAppIcon -New ('<span style={{ fontSize: "32px" }}>\uD83D\uDCAC</span>' + "`r`n" + '                <div>' + "`r`n" + '                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#1A1A2E", marginBottom: "2px" }}>WhatsApp Assessment</div>')
}

$oldStreakBullets = "Emoji mood picker " + $replacementChar + " 60-second Vibe Check " + $replacementChar + " Track your streak"
if ($script:text.Contains($oldStreakBullets)) {
  Replace-OrThrow -Label 'Streak bullets' -Old $oldStreakBullets -New 'Emoji mood picker &bull; 60-second Vibe Check &bull; Track your streak'
}

$oldChatBullets = "Chat-based PHQ-9 " + $replacementChar + " Reply at your pace " + $replacementChar + " Get PDF report"
if ($script:text.Contains($oldChatBullets)) {
  Replace-OrThrow -Label 'Chat bullets' -Old $oldChatBullets -New 'Chat-based PHQ-9 &bull; Reply at your pace &bull; Get PDF report'
}

# Search overlay
if ($script:text.Contains('<span style={{ fontSize: "16px", color: "#666680" }}>??</span>')) {
  Replace-OrThrow -Label 'Search icon' -Old '<span style={{ fontSize: "16px", color: "#666680" }}>??</span>' -New '<span style={{ fontSize: "16px", color: "#666680" }}>\uD83D\uDD0E</span>'
}
Replace-OrThrow -Label 'Search placeholder' -Old ('placeholder="Try ''couples therapy'' or ''I feel anxious''' + $replacementChar + '"') -New 'placeholder="Try ''couples therapy'' or ''I feel anxious''..."'

# Left dock panel icons/separators
$oldQuickAccessAI = '{ icon: "??", title: "AnytimeBUDDY", text: "Your 24/7 AI companion", tag: "LIVE" },'
if ($script:text.Contains($oldQuickAccessAI)) {
  Replace-OrThrow -Label 'Quick Access AI icon' -Old $oldQuickAccessAI -New '{ icon: "\\uD83E\\uDD16", title: "AnytimeBUDDY", text: "Your 24/7 AI companion", tag: "LIVE" },'
}

$oldQuickAccessPets = '{ icon: "??", title: "Digital Pets", text: "Oxytocin ' + $replacementChar + ' Serotonin ' + $replacementChar + ' Dopamine", tag: "NEW" },'
if ($script:text.Contains($oldQuickAccessPets)) {
  Replace-OrThrow -Label 'Quick Access pets icon/text' -Old $oldQuickAccessPets -New '{ icon: "\\uD83D\\uDC3E", title: "Digital Pets", text: "Oxytocin &bull; Serotonin &bull; Dopamine", tag: "NEW" },'
}

$oldQuickAccessSound = '{ icon: "??", title: "Sound Therapy", text: "Sleep, calm, focus" }'
if ($script:text.Contains($oldQuickAccessSound)) {
  Replace-OrThrow -Label 'Quick Access sound icon' -Old $oldQuickAccessSound -New '{ icon: "\\uD83C\\uDFA7", title: "Sound Therapy", text: "Sleep, calm, focus" }'
}

$oldWhatsAppBook = '{ icon: "???", title: "WA Book Session", text: "Book therapist via WhatsApp" },'
if ($script:text.Contains($oldWhatsAppBook)) {
  Replace-OrThrow -Label 'WhatsApp book icon' -Old $oldWhatsAppBook -New '{ icon: "\\uD83D\\uDCC5", title: "WA Book Session", text: "Book therapist via WhatsApp" },'
}

$oldWhatsAppSession = '{ icon: "??", title: "WA Session", text: "Text-based therapy chat" }'
if ($script:text.Contains($oldWhatsAppSession)) {
  Replace-OrThrow -Label 'WhatsApp session icon' -Old $oldWhatsAppSession -New '{ icon: "\\uD83D\\uDCAC", title: "WA Session", text: "Text-based therapy chat" }'
}

$oldFreeScreening = '{ icon: "??", title: "Free Screening", text: "PHQ-9 ' + $replacementChar + ' GAD-7 ' + $replacementChar + ' 3 min" },'
if ($script:text.Contains($oldFreeScreening)) {
  Replace-OrThrow -Label 'Free screening icon/text' -Old $oldFreeScreening -New '{ icon: "\\uD83D\\uDCDD", title: "Free Screening", text: "PHQ-9 &bull; GAD-7 &bull; 3 min" },'
}

$oldAISelfService = '{ icon: "??", title: "AI Self-Service", text: "CBT ' + $replacementChar + ' Journaling ' + $replacementChar + ' Mood" }'
if ($script:text.Contains($oldAISelfService)) {
  Replace-OrThrow -Label 'AI self-service icon/text' -Old $oldAISelfService -New '{ icon: "\\uD83E\\uDDE0", title: "AI Self-Service", text: "CBT &bull; Journaling &bull; Mood" }'
}

# Post-processing: fix double-escaped unicode sequences inserted earlier
if ($script:text.Contains('\\u')) {
  $script:text = $script:text.Replace('\\u', '\u')
}

# Ensure bullet separators inside JS string literals are real bullets
$script:text = $script:text.Replace('&bull;', '\u2022')

# But JSX text nodes don't interpret \u2022; keep bullets as HTML entities there
$script:text = $script:text.Replace('<span style={{ fontSize: "11px", fontWeight: 800, opacity: 0.8 }}>\u2022</span>', '<span style={{ fontSize: "11px", fontWeight: 800, opacity: 0.8 }}>&bull;</span>')
$script:text = $script:text.Replace('>Emoji mood picker \u2022 60-second Vibe Check \u2022 Track your streak</div>', '>Emoji mood picker &bull; 60-second Vibe Check &bull; Track your streak</div>')
$script:text = $script:text.Replace('>Chat-based PHQ-9 \u2022 Reply at your pace \u2022 Get PDF report</div>', '>Chat-based PHQ-9 &bull; Reply at your pace &bull; Get PDF report</div>')

# JSX text nodes don't interpret \uXXXX; convert them to HTML entities
$script:text = $script:text.Replace('>\uD83D\uDCF1<', '>&#128241;<')
$script:text = $script:text.Replace('>\uD83D\uDCAC<', '>&#128172;<')
$script:text = $script:text.Replace('>\uD83D\uDD0E<', '>&#128270;<')

# Insert professionals section before assessSection if missing
if (-not $script:text.Contains('FOR MENTAL HEALTH PROFESSIONALS')) {
  $target = "      <section`r`n        id=""assessSection"""
  if (-not $script:text.Contains($target)) {
    throw 'Insertion target not found.'
  }

  $pro = @(
    '      <section aria-label="For Mental Health Professionals" style={{ background: "white", padding: "44px 16px 0 16px" }}>',
    '        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>',
    '          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>',
    '            <div>',
    '              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 900, letterSpacing: "2px", textTransform: "uppercase", color: "#0B2D5E", marginBottom: "10px" }}>',
    '                <span style={{ fontSize: "14px" }}>&#10022;</span>',
    '                FOR MENTAL HEALTH PROFESSIONALS',
    '              </div>',
    '              <div style={{ fontSize: "34px", fontWeight: 900, color: "#0F172A", lineHeight: 1.15, marginBottom: "10px" }}>Join India''s growing network</div>',
    '              <div style={{ fontSize: "13px", color: "#64748B", lineHeight: 1.6, fontWeight: 700, maxWidth: "760px" }}>Connect with people who need support, manage your availability easily, and deliver care on a secure platform.</div>',
    '            </div>',
    '          </div>',
    '          <div className="pro-grid" style={{ marginTop: "18px", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "14px" }}>',
    '            <div style={{ background: "white", border: "1px solid #E8EDF2", borderRadius: "16px", padding: "18px 16px", boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)" }}><div style={{ fontSize: "15px", fontWeight: 900, color: "#1A1A2E", marginBottom: "6px" }}>Psychologist</div><div style={{ fontSize: "12px", color: "#666680", lineHeight: 1.55, fontWeight: 700 }}>Counseling, therapy and assessments</div></div>',
    '            <div style={{ background: "white", border: "1px solid #E8EDF2", borderRadius: "16px", padding: "18px 16px", boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)" }}><div style={{ fontSize: "15px", fontWeight: 900, color: "#1A1A2E", marginBottom: "6px" }}>Psychiatrist</div><div style={{ fontSize: "12px", color: "#666680", lineHeight: 1.55, fontWeight: 700 }}>Diagnosis, treatment and medication</div></div>',
    '            <div style={{ background: "white", border: "1px solid #E8EDF2", borderRadius: "16px", padding: "18px 16px", boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)" }}><div style={{ fontSize: "15px", fontWeight: 900, color: "#1A1A2E", marginBottom: "6px" }}>Therapist</div><div style={{ fontSize: "12px", color: "#666680", lineHeight: 1.55, fontWeight: 700 }}>Talk therapy and structured programs</div></div>',
    '            <div style={{ background: "white", border: "1px solid #E8EDF2", borderRadius: "16px", padding: "18px 16px", boxShadow: "0 12px 26px rgba(0, 0, 0, 0.06)" }}><div style={{ fontSize: "15px", fontWeight: 900, color: "#1A1A2E", marginBottom: "6px" }}>NLP Coach</div><div style={{ fontSize: "12px", color: "#666680", lineHeight: 1.55, fontWeight: 700 }}>Mindset coaching and guided goals</div></div>',
    '          </div>',
    '        </div>',
    '      </section>'
  )

  $insert = ($pro -join "`r`n") + "`r`n`r`n" + $target
  $script:text = $script:text.Replace($target, $insert)
}

# Write as UTF-8 with BOM
$utf8Bom = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($path, $script:text, $utf8Bom)

Write-Output "Updated: $path"
