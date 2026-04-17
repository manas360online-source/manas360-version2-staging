$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$path = Join-Path $root 'frontend\src\pages\LandingPage.tsx'
$path = [System.IO.Path]::GetFullPath($path)

if (-not (Test-Path -LiteralPath $path)) {
  throw "LandingPage.tsx not found at: $path"
}

$text = Get-Content -LiteralPath $path -Raw

# 1) Add mega menu types (only if missing)
if (-not $text.Contains('type QuickNavMegaItem')) {
  $typeInsert = @'

type QuickNavMegaItem = {
  icon: string;
  title: string;
  subtitle: string;
  badge?: string;
};

type QuickNavMegaMenu = {
  accent: string;
  title: string;
  subtitle: string;
  columns: number;
  items: QuickNavMegaItem[];
};
'@

  $liveCardPattern = '(?s)type LiveCard = \{.*?\};'
  $m = [regex]::Match($text, $liveCardPattern)
  if (-not $m.Success) { throw 'LiveCard type block not found.' }
  $text = $text.Insert($m.Index + $m.Length, $typeInsert)
}

# 2) Add state + timer ref (only if missing)
if (-not $text.Contains('activeQuickNav')) {
  $anchor = '  const [leftPanelOpen, setLeftPanelOpen] = useState(false);'
  if (-not $text.Contains($anchor)) { throw 'leftPanelOpen state anchor not found.' }

  $stateBlock = @'
  const [activeQuickNav, setActiveQuickNav] = useState<string | null>(null);
  const quickNavCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
'@

  $text = $text.Replace($anchor, ($anchor + "`r`n" + $stateBlock.TrimEnd()))
}

# 3) Close mega menu on Escape
if (-not $text.Contains('setActiveQuickNav(null);')) {
  $escapeAnchor = '        setLoginDropdownOpen(false);'
  if (-not $text.Contains($escapeAnchor)) { throw 'Escape handler anchor not found.' }
  $text = $text.Replace($escapeAnchor, ($escapeAnchor + "`r`n" + '        setActiveQuickNav(null);'))
}

# 4) Add cleanup effect for quickNavCloseTimer
if (-not $text.Contains('quickNavCloseTimer.current')) {
  $leftCleanup = @'
  useEffect(() => {
    return () => {
      if (leftPanelCloseTimer.current) {
        clearTimeout(leftPanelCloseTimer.current);
      }
    };
  }, []);
'@

  if (-not $text.Contains($leftCleanup)) { throw 'leftPanel cleanup useEffect block not found (pattern mismatch).' }

  $quickCleanup = @'

  useEffect(() => {
    return () => {
      if (quickNavCloseTimer.current) {
        clearTimeout(quickNavCloseTimer.current);
      }
    };
  }, []);
'@

  $text = $text.Replace($leftCleanup, ($leftCleanup + $quickCleanup))
}

# 5) Insert mega menu data + hover handlers after quickNavItems block
if (-not $text.Contains('const quickNavMegaMenus')) {
  $qnPattern = '(?s)\r?\n\s*const quickNavItems: Array<\{ icon: string; label: string \}> = useMemo\(\s*\(\) => \[\s*.*?\s*\],\s*\[\]\s*\);'
  $m = [regex]::Match($text, $qnPattern)
  if (-not $m.Success) { throw 'quickNavItems useMemo block not found.' }

  $insertion = @'

  const quickNavMegaMenus: Record<string, QuickNavMegaMenu> = useMemo(
    () => ({
      "I Need a Helping Hand": {
        accent: "#16A34A",
        title: "I Need a Helping Hand",
        subtitle: "Start your healing journey",
        columns: 5,
        items: [
          { icon: "\uD83E\uDE7A", title: "Free Screening", subtitle: "2-min PHQ-9 mood assessment", badge: "Free" },
          { icon: "\uD83E\uDDE0", title: "Find a Therapist", subtitle: "Psychologists & counselors" },
          { icon: "\u2695\uFE0F", title: "See a Psychiatrist", subtitle: "Medication & diagnosis" },
          { icon: "\uD83C\uDFAF", title: "Specialized Care", subtitle: "OCD, PTSD, addiction, child" },
          { icon: "\uD83D\uDC65", title: "Group Sessions", subtitle: "Peer support from \u20B999", badge: "\u20B999" },
          { icon: "\uD83D\uDEA8", title: "Crisis Support", subtitle: "Immediate 24/7 help", badge: "SOS" }
        ]
      },
      "AI Power Hub": {
        accent: "#7C3AED",
        title: "AI Power Hub",
        subtitle: "AI-driven tools \u2014 24/7, no appointment needed",
        columns: 4,
        items: [
          { icon: "\uD83E\uDD16", title: "Anytime Buddy AI", subtitle: "Guidance from your AI companion", badge: "AI" },
          { icon: "\uD83D\uDCAC", title: "AnytimeBuddy Chat", subtitle: "24/7 text companion", badge: "24/7" },
          { icon: "\u2601\uFE0F", title: "Vent Buddy", subtitle: "Safe space to express feelings", badge: "Soon" },
          { icon: "\uD83D\uDCDD", title: "AI Session Notes", subtitle: "Claude-powered clinical summaries", badge: "Pro" }
        ]
      },
      "Digital Pets4Happy Hormones": {
        accent: "#F97316",
        title: "Digital Pets4Happy Hormones",
        subtitle: "4 pets, 4 hormones \u2014 nurture them, nurture you",
        columns: 5,
        items: [
          { icon: "\uD83E\uDD95", title: "Baby Dinosaur", subtitle: "Oxytocin \u2014 nurture, bond, feel loved", badge: "Love" },
          { icon: "\uD83D\uDC15", title: "Golden Retriever", subtitle: "Serotonin \u2014 daily routines, calm, stability", badge: "Happy" },
          { icon: "\uD83D\uDC18", title: "Healing Elephant", subtitle: "Dopamine \u2014 achievements, games, milestones", badge: "Reward" },
          { icon: "\uD83E\uDD8A", title: "Chintu Fox", subtitle: "Endorphins \u2014 breathwork, play, laughter", badge: "Energy" },
          { icon: "\uD83D\uDC9D", title: "Name Your Pet \u2014 Adopt", subtitle: "Choose, name, and start your journey", badge: "Free" }
        ]
      },
      "Premium Therapy Hub": {
        accent: "#0EA5A4",
        title: "Premium Therapy Hub",
        subtitle: "Clinically supervised, evidence-based sessions",
        columns: 5,
        items: [
          { icon: "\uD83E\uDDE0", title: "1-on-1 Therapy", subtitle: "Psychologist sessions from \u20B9699", badge: "\u20B9699" },
          { icon: "\u2695\uFE0F", title: "Psychiatry Consult", subtitle: "Medication review from \u20B9999", badge: "\u20B9999" },
          { icon: "\uD83D\uDC91", title: "Couples Therapy", subtitle: "Rebuild your relationship", badge: "\u20B91,499" },
          { icon: "\uD83D\uDC65", title: "Group Therapy", subtitle: "Peer circles from \u20B9149", badge: "\u20B9149" },
          { icon: "\uD83C\uDFB5", title: "Sound Therapy", subtitle: "Raga healing + sleep tracks", badge: "20 Free" },
          { icon: "\uD83D\uDCBC", title: "Executive Coaching", subtitle: "High-performance wellness", badge: "Pro" }
        ]
      },
      "Self-Help Tools": {
        accent: "#A16207",
        title: "Self-Help Tools",
        subtitle: "Free tools you can use right now \u2014 no login needed",
        columns: 5,
        items: [
          { icon: "\uD83D\uDCCA", title: "Mood Tracker", subtitle: "Track emotional trends daily", badge: "Free" },
          { icon: "\uD83C\uDFB5", title: "Sound Therapy", subtitle: "Calm sound-based relaxation", badge: "Free" },
          { icon: "\uD83C\uDF2C\uFE0F", title: "Breathing Exercises", subtitle: "4-7-8 \u2022 Box \u2022 Calm Breath \u2022 Guided sessions", badge: "Free" },
          { icon: "\uD83D\uDCD3", title: "Journaling Prompts", subtitle: "Daily reflection questions" },
          { icon: "\uD83C\uDF19", title: "Sleep Guide", subtitle: "Hygiene checklist + wind-down" },
          { icon: "\uD83D\uDCC4", title: "CBT Worksheets", subtitle: "Thought records & behavioral experiments", badge: "Free" }
        ]
      },
      "Find a Spark Again": {
        accent: "#E11D48",
        title: "Find a Spark Again",
        subtitle: "Couples, parents & families",
        columns: 4,
        items: [
          { icon: "\uD83D\uDC91", title: "Find a Spark \u2014 Couples", subtitle: "Reignite your connection" },
          { icon: "\uD83D\uDC6A", title: "Concerned Parent", subtitle: "Help for your child" },
          { icon: "\uD83D\uDC6A", title: "Family Plan", subtitle: "Care for 2-5 members", badge: "\u20B9499+" },
          { icon: "\uD83C\uDF93", title: "Teen & Student", subtitle: "Age-appropriate support", badge: "50% off" }
        ]
      },
      "For Corporates / Edu / Healthcare": {
        accent: "#1D4ED8",
        title: "For Corporates / Edu / Healthcare",
        subtitle: "Corporate, education institutions & healthcare units",
        columns: 4,
        items: [
          { icon: "\uD83C\uDFE2", title: "Corporate Wellness", subtitle: "Employee mental health programs" },
          { icon: "\uD83C\uDFEB", title: "Education Institutions", subtitle: "School & college wellness programs" },
          { icon: "\uD83C\uDFE5", title: "Healthcare Units", subtitle: "Hospital & clinic integration" },
          { icon: "\uD83C\uDFDB\uFE0F", title: "Government Agency", subtitle: "Tele-MANAS & ASHA worker programs" }
        ]
      },
      Certify2EarnMore: {
        accent: "#16A34A",
        title: "Certify2EarnMore",
        subtitle: "Certifications, training & shop",
        columns: 4,
        items: [
          { icon: "\uD83C\uDFC6", title: "Certification Hub", subtitle: "CBT, NLP, 5Whys training", badge: "Pro" },
          { icon: "\uD83E\uDDD1", title: "Join as Therapist", subtitle: "Earn \u20B950K-2L/month" },
          { icon: "\uD83C\uDFD5\uFE0F", title: "Wellness Retreats", subtitle: "Rishikesh, Coorg, Goa" },
          { icon: "\uD83D\uDED2", title: "Wellness Shop", subtitle: "Journals, tools, merch" }
        ]
      }
    }),
    []
  );

  const openQuickNavMenu = (label: string) => {
    if (!quickNavMegaMenus[label]) {
      setActiveQuickNav(null);
      return;
    }
    if (quickNavCloseTimer.current) {
      clearTimeout(quickNavCloseTimer.current);
      quickNavCloseTimer.current = null;
    }
    setActiveQuickNav(label);
  };

  const keepQuickNavMenuOpen = () => {
    if (quickNavCloseTimer.current) {
      clearTimeout(quickNavCloseTimer.current);
      quickNavCloseTimer.current = null;
    }
  };

  const closeQuickNavMenuWithDelay = () => {
    if (quickNavCloseTimer.current) {
      clearTimeout(quickNavCloseTimer.current);
    }
    quickNavCloseTimer.current = setTimeout(() => {
      setActiveQuickNav(null);
    }, 120);
  };
'@

  $insertAt = $m.Index + $m.Length
  $text = $text.Insert($insertAt, $insertion)
}

# 6) Replace quick-nav JSX with hover + overlay version
if (-not $text.Contains('closeQuickNavMenuWithDelay')) {
  throw 'Hover handler functions missing; aborting JSX rewrite to avoid partial update.'
}

$oldQuickNav = @'
            <div className="quick-nav" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap", flex: 1, minWidth: 0, maxWidth: "100%" }}>
              {quickNavItems.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "clamp(9px, 0.85vw, 11px)",
                    fontWeight: 800,
                    color: "#1A1A2E",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    padding: "4px 8px",
                    borderRadius: "999px",
                    border: "1px solid rgba(232, 237, 242, 0.9)",
                    background: "rgba(250, 252, 255, 0.9)"
                  }}
                >
                  <span style={{ fontSize: "clamp(11px, 1.0vw, 13px)" }}>{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
'@

$newQuickNav = @'
            <div style={{ position: "relative", flex: 1, minWidth: 0 }} onMouseEnter={keepQuickNavMenuOpen} onMouseLeave={closeQuickNavMenuWithDelay}>
              <div className="quick-nav" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "nowrap", flex: 1, minWidth: 0, maxWidth: "100%" }}>
                {quickNavItems.map((item) => {
                  const menu = quickNavMegaMenus[item.label];
                  const isActive = activeQuickNav === item.label && !!menu;
                  const accent = menu?.accent;

                  return (
                    <div
                      key={item.label}
                      onMouseEnter={() => openQuickNavMenu(item.label)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "clamp(9px, 0.85vw, 11px)",
                        fontWeight: 800,
                        color: "#1A1A2E",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        padding: "4px 8px",
                        borderRadius: "999px",
                        border: isActive && accent ? `1px solid ${accent}` : "1px solid rgba(232, 237, 242, 0.9)",
                        background: isActive ? "rgba(255,255,255,0.98)" : "rgba(250, 252, 255, 0.9)",
                        boxShadow: isActive ? "0 10px 24px rgba(15, 23, 42, 0.10)" : "none"
                      }}
                    >
                      <span style={{ fontSize: "clamp(11px, 1.0vw, 13px)" }}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {activeQuickNav && quickNavMegaMenus[activeQuickNav] && (
                <div style={{ position: "absolute", left: 0, right: 0, top: "calc(100% + 10px)", zIndex: 170 }}>
                  <div
                    style={{
                      background: "white",
                      borderRadius: "18px",
                      border: "1px solid rgba(226, 232, 240, 0.95)",
                      boxShadow: "0 28px 90px rgba(15, 23, 42, 0.22)",
                      overflow: "hidden"
                    }}
                  >
                    <div style={{ height: "3px", background: quickNavMegaMenus[activeQuickNav].accent }} />

                    <div style={{ padding: "18px 18px 16px 18px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                        <div>
                          <div style={{ fontSize: "18px", fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>
                            {quickNavMegaMenus[activeQuickNav].title}
                          </div>
                          <div style={{ marginTop: "4px", fontSize: "12px", fontWeight: 700, color: "#64748B" }}>
                            {quickNavMegaMenus[activeQuickNav].subtitle}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "14px",
                          display: "grid",
                          gridTemplateColumns: `repeat(${quickNavMegaMenus[activeQuickNav].columns}, minmax(0, 1fr))`,
                          gap: "10px"
                        }}
                      >
                        {quickNavMegaMenus[activeQuickNav].items.map((mi) => (
                          <div
                            key={mi.title}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: "10px",
                              padding: "12px 12px",
                              borderRadius: "14px",
                              background: "rgba(255,255,255,0.98)",
                              cursor: "default"
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "#FAFCFF";
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.98)";
                            }}
                          >
                            <div
                              style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "10px",
                                border: "1px solid rgba(232, 237, 242, 0.95)",
                                background: "#FFFFFF",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flex: "0 0 auto",
                                fontSize: "18px"
                              }}
                              aria-hidden
                            >
                              {mi.icon}
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                <div style={{ fontSize: "13px", fontWeight: 900, color: "#0F172A", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {mi.title}
                                </div>
                                {mi.badge && (
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: 900,
                                      padding: "2px 8px",
                                      borderRadius: "999px",
                                      border: "1px solid rgba(232, 237, 242, 0.95)",
                                      background: "#F1F5F9",
                                      color: "#0F172A",
                                      whiteSpace: "nowrap"
                                    }}
                                  >
                                    {mi.badge}
                                  </div>
                                )}
                              </div>
                              <div style={{ marginTop: "2px", fontSize: "11px", fontWeight: 700, color: "#64748B", lineHeight: 1.45 }}>
                                {mi.subtitle}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
'@

if (-not $text.Contains($oldQuickNav)) {
  throw 'Old quick-nav JSX block not found (pattern mismatch).'
}
$text = $text.Replace($oldQuickNav, $newQuickNav)

Set-Content -LiteralPath $path -Value $text -Encoding utf8

Write-Output ("Updated: " + $path)
Write-Output '---'
Select-String -Path $path -Pattern 'type QuickNavMegaItem|activeQuickNav|const quickNavMegaMenus|openQuickNavMenu|closeQuickNavMenuWithDelay' | Select-Object -First 30 | ForEach-Object { $_.ToString() } | Write-Output
