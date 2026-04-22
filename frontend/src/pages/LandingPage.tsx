import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { groupTherapyApi } from "../api/groupTherapy";

type Language = "English" | "Hindi" | "Kannada" | "Tamil" | "Telugu";

type LoginOption = {
  type: string;
  label: string;
  icon: string;
  desc: string;
};

type LiveCard = {
  id?: string;
  icon: string;
  title: string;
  doctor: string;
  language: string;
  seats: string;
  rightBadge: string;
  buttonText: string;
  bg: string;
  buttonBg: string;
};
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

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loginDropdownOpen, setLoginDropdownOpen] = useState(false);
  const [showTopPromo, setShowTopPromo] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>("English");
  const [isScrolled, setIsScrolled] = useState(false);
  const [leftPanelOpen, setLeftPanelOpen] = useState(false);
  const [activeQuickNav, setActiveQuickNav] = useState<string | null>(null);
  const [liveCards, setLiveCards] = useState<LiveCard[]>([]);
  const quickNavCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leftPanelCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const navbar = document.querySelector(".brand-bar");
      if (!navbar) return;
      if (window.scrollY > 10) navbar.classList.add("scrolled");
      else navbar.classList.remove("scrolled");

      setIsScrolled(window.scrollY > 90);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        setShowSearch(false);
        setLoginDropdownOpen(false);
        setActiveQuickNav(null);
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const handleLogin = (type: string) => {
    setLoginDropdownOpen(false);
    setTimeout(() => {
      navigate(`/auth/login?userType=${type}`);
    }, 100);
  };

  const handleScrollToAssess = () => {
    navigate("/assessment");
  };

  const handleHitASixerPromo = () => {
    navigate("/hit-a-sixer");
  };

  const handleQuickNavMegaItemClick = (menuLabel: string, itemTitle?: string) => {
    const normalizedItemTitle = String(itemTitle || '').toLowerCase();
    if (normalizedItemTitle.includes('group therapy') || normalizedItemTitle.includes('group sessions')) {
      setActiveQuickNav(null);
      navigate('/group-therapy');
      return;
    }

    if (menuLabel === "I Need a Helping Hand") {
      setActiveQuickNav(null);
      navigate("/helping-hand");
      return;
    }

    if (menuLabel === "AI Power Hub") {
      setActiveQuickNav(null);
      navigate("/ai-power-hub");
      return;
    }

    if (menuLabel === "Find a Spark Again") {
      setActiveQuickNav(null);
      navigate("/find-spark");
      return;
    }

    if (menuLabel === "Self-Help Tools") {
      setActiveQuickNav(null);
      navigate("/self-help");
      return;
    }

    if (menuLabel === "For Corporates / Edu / Healthcare") {
      setActiveQuickNav(null);
      navigate("/corporate-landing");
      return;
    }

    if (menuLabel === "Premium Therapy Hub") {
      setActiveQuickNav(null);
      if (itemTitle === "Group Therapy") {
        navigate("/group-therapy");
        return;
      }
      if (itemTitle === "Sound Therapy") {
        navigate("/patient/sound-therapy");
        return;
      }
      navigate("/premium-theraphy");
      return;
    }

    if (menuLabel === "MyDigitalClinic") {
      setActiveQuickNav(null);
      navigate("/my-digital-clinic");
      return;
    }

    if (menuLabel === "Certify2EarnMore") {
      setActiveQuickNav(null);
      navigate("/certifications");
      return;
    }

    if (menuLabel === "Digital Pets4Happy Hormones") {
      setActiveQuickNav(null);
      navigate("/pet");
    }
  };

  const footerQuickLinkRoutes: Record<string, string> = {
    "About Us": "/landing",
    "How It Works": "/how-it-works",
    "Specialized Care": "/specialized-care",
    "For Providers": "/my-digital-clinic",
    MyDigitalClinic: "/my-digital-clinic",
    Careers: "/corporate-landing"
  };

  const footerLegalRoutes: Record<string, string> = {
    "Privacy Policy": "/privacy",
    "Terms of Service": "/terms",
    "Cookie Policy": "/cookie-policy",
    "DPDPA Compliance": "/privacy",
    "Refund Policy": "/refunds",
    Disclaimer: "/terms"
  };

  const handleFooterRoute = (routeMap: Record<string, string>, label: string) => {
    const path = routeMap[label];
    if (path) {
      navigate(path);
    }
  };

  const openLeftPanel = () => {
    if (leftPanelCloseTimer.current) {
      clearTimeout(leftPanelCloseTimer.current);
      leftPanelCloseTimer.current = null;
    }
    setLeftPanelOpen(true);
  };

  const closeLeftPanelWithDelay = () => {
    if (leftPanelCloseTimer.current) {
      clearTimeout(leftPanelCloseTimer.current);
    }
    leftPanelCloseTimer.current = setTimeout(() => {
      setLeftPanelOpen(false);
    }, 120);
  };

  useEffect(() => {
    return () => {
      if (leftPanelCloseTimer.current) {
        clearTimeout(leftPanelCloseTimer.current);
      }
    };
  }, []);
  useEffect(() => {
    return () => {
      if (quickNavCloseTimer.current) {
        clearTimeout(quickNavCloseTimer.current);
      }
    };
  }, []);

  const loginOptions: LoginOption[] = useMemo(
    () => [
      { type: "patient", label: "Patient", icon: "\uD83E\uDDD1", desc: "Find therapy & healing" },
      { type: "therapist", label: "Therapist", icon: "\u2695\uFE0F", desc: "Join & earn" },
      { type: "corporate", label: "Corporate", icon: "\uD83C\uDFE2", desc: "Wellness programs" },
      { type: "clinic", label: "Clinic", icon: "\uD83C\uDFE5", desc: "Manage practice" }
    ],
    []
  );
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
      },
      MyDigitalClinic: {
        accent: "#1D4ED8",
        title: "MyDigitalClinic",
        subtitle: "Digitize your practice - your patients, your data",
        columns: 5,
        items: [
          { icon: "\uD83D\uDC64", title: "Patient Database", subtitle: "DPDPA-compliant vault" },
          { icon: "\uD83D\uDCDD", title: "Session Notes", subtitle: "SOAP, CBT, Trauma templates" },
          { icon: "\uD83D\uDCC6", title: "Scheduling", subtitle: "Booking + auto-reminders" },
          { icon: "\uD83D\uDC8A", title: "Prescriptions", subtitle: "Digital sign + PDF + delivery" },
          { icon: "\uD83D\uDCCA", title: "Progress Tracking", subtitle: "PHQ-9/GAD-7 trends" },
          { icon: "\u2728", title: "21-Day Free Trial", subtitle: "All modules unlocked", badge: "Free" }
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

  const defaultLiveCards: LiveCard[] = useMemo(
    () => [
      {
        id: "mock-anxiety",
        icon: "\uD83E\uDDE0",
        title: "Anxiety Support Circle",
        doctor: "Dr. Priya",
        language: "English",
        seats: "Only 1 seat left!",
        rightBadge: "LIVE",
        buttonText: "JOIN NOW \u2192 FREE",
        bg: "linear-gradient(135deg, rgba(255, 227, 214, 0.75), rgba(255, 245, 239, 0.9))",
        buttonBg: "linear-gradient(135deg, #FF6A00, #FF8A3D)"
      },
      {
        id: "mock-burnout",
        icon: "\uD83D\uDD25",
        title: "Work Burnout Recovery",
        doctor: "Dr. Meera",
        language: "English",
        seats: "Only 3 seats left!",
        rightBadge: "LIVE",
        buttonText: "JOIN NOW \u2192 FREE",
        bg: "linear-gradient(135deg, rgba(220, 252, 231, 0.75), rgba(240, 253, 244, 0.92))",
        buttonBg: "linear-gradient(135deg, #15803D, #22C55E)"
      },
      {
        id: "mock-grief",
        icon: "\uD83D\uDD6F\uFE0F",
        title: "Grief & Loss — Safe Space",
        doctor: "Dr. Rajan",
        language: "Hindi",
        seats: "Only 2 seats left!",
        rightBadge: "Starting Soon",
        buttonText: "JOIN \u2192 Starting Soon",
        bg: "linear-gradient(135deg, rgba(214, 232, 255, 0.75), rgba(238, 246, 255, 0.92))",
        buttonBg: "linear-gradient(135deg, #1D4ED8, #3B82F6)"
      },
      {
        id: "mock-couples",
        icon: "\uD83D\uDC9E",
        title: "Couples Communication Workshop",
        doctor: "Ms. Ananya",
        language: "Kannada",
        seats: "6/15 joined",
        rightBadge: "1H 10M",
        buttonText: "Remind Me",
        bg: "linear-gradient(135deg, rgba(237, 233, 254, 0.9), rgba(245, 243, 255, 0.98))",
        buttonBg: "linear-gradient(135deg, #6D28D9, #7C3AED)"
      }
    ],
    []
  );

  useEffect(() => {
    const toStatusBadge = (scheduledAt: string, durationMinutes: number): string => {
      const now = Date.now();
      const start = new Date(scheduledAt).getTime();
      if (Number.isNaN(start)) return "Upcoming";
      const end = start + Math.max(30, Number(durationMinutes || 60)) * 60 * 1000;
      if (now >= start && now <= end) return "LIVE";
      const diffMin = Math.ceil((start - now) / (60 * 1000));
      if (diffMin > 0 && diffMin <= 120) return "Starting Soon";
      if (diffMin > 120) {
        const hrs = Math.floor(diffMin / 60);
        const mins = diffMin % 60;
        return hrs > 0 ? `${hrs}H ${mins}M` : `${mins}M`;
      }
      return "Upcoming";
    };

    const pickIcon = (title: string, topic: string): string => {
      const key = `${title} ${topic}`.toLowerCase();
      if (key.includes("anxiety")) return "\uD83E\uDDE0";
      if (key.includes("burnout")) return "\uD83D\uDD25";
      if (key.includes("grief") || key.includes("loss")) return "\uD83D\uDD6F\uFE0F";
      if (key.includes("couple") || key.includes("relationship")) return "\uD83D\uDC9E";
      return "\uD83D\uDC65";
    };

    const loadLiveCards = async () => {
      try {
        const response = await groupTherapyApi.listPublicSessions();
        const rows = Array.isArray(response?.items) ? response.items : [];

        const mapped: LiveCard[] = rows
          .slice(0, 4)
          .map((row: any) => {
            const price = Number(row?.priceMinor || 0);
            const maxMembers = Number(row?.maxMembers || 0);
            const joinedCount = Number(row?.joinedCount || 0);
            const seatsLeft = maxMembers > 0 ? Math.max(0, maxMembers - joinedCount) : null;
            const status = toStatusBadge(String(row?.scheduledAt || ""), Number(row?.durationMinutes || 60));

            return {
              id: String(row?.id || ""),
              icon: pickIcon(String(row?.title || ""), String(row?.topic || "")),
              title: String(row?.title || "Group Therapy Session"),
              doctor: String(row?.hostName || "MANAS360 Expert"),
              language: String(row?.language || "English"),
              seats: seatsLeft !== null ? (seatsLeft <= 3 ? `Only ${seatsLeft} seat${seatsLeft === 1 ? "" : "s"} left!` : `${joinedCount}/${maxMembers} joined`) : "Limited seats",
              rightBadge: String(row?.status || "").toUpperCase() === "LIVE" ? "LIVE" : status,
              buttonText: price > 0 ? `JOIN NOW → ₹${Math.round(price / 100)}` : "JOIN NOW → FREE",
              bg: "linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.96))",
              buttonBg: (String(row?.status || "").toUpperCase() === "LIVE" || status === "LIVE") ? "linear-gradient(135deg, #FF6A00, #FF8A3D)" : "linear-gradient(135deg, #2563EB, #3B82F6)",
            };
          });

        setLiveCards(mapped.length > 0 ? mapped : defaultLiveCards);
      } catch {
        setLiveCards(defaultLiveCards);
      }
    };

    void loadLiveCards();
  }, [defaultLiveCards]);

  const languageLabelMap: Record<Language, string> = {
    English: "English",
    Hindi: "हिन्दी",
    Tamil: "தமிழ்",
    Telugu: "తెలుగు",
    Kannada: "ಕನ್ನಡ"
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        backgroundImage: 'url("/You%20renot%20alone-Beach.jpeg")',
        backgroundPosition: "center",
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat"
      }}
    >
      {showTopPromo && !isScrolled && (
        <div
          style={{
            background: "linear-gradient(90deg, #2E7D32, #2F855A)",
            color: "white",
            fontSize: "12px",
            fontWeight: 700
          }}
        >
          <div
            style={{
              maxWidth: "1260px",
              margin: "0 auto",
              padding: "10px 16px",
              display: "flex",
              alignItems: "center",
              gap: "14px"
            }}
            role="button"
            tabIndex={0}
            onClick={handleHitASixerPromo}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleHitASixerPromo();
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
              <span style={{ opacity: 0.95 }}>&#127951;</span>
              <span style={{ whiteSpace: "nowrap" }}>HIT A SIXER!</span>
              <span style={{ opacity: 0.95, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                Refer a friend & both get <span style={{ color: "#FFE082" }}>10% off</span> next therapy session
              </span>
            </div>

            <button
              type="button"
              onClick={handleHitASixerPromo}
              style={{
                border: "none",
                cursor: "pointer",
                background: "#9CCC65",
                color: "#1B1B1B",
                fontWeight: 800,
                fontSize: "11px",
                padding: "6px 14px",
                borderRadius: "16px",
                whiteSpace: "nowrap"
              }}
            >
              CLAIM &#8377;70 CREDIT &#9889;
            </button>

            <span style={{ fontSize: "11px", fontWeight: 600, opacity: 0.9, whiteSpace: "nowrap" }}>
              Offer expires in 23:57:36
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowTopPromo(false);
              }}
              aria-label="Close"
              style={{
                border: "none",
                cursor: "pointer",
                background: "transparent",
                color: "rgba(255,255,255,0.9)",
                fontSize: "16px",
                lineHeight: 1
              }}
            >
              &times;
            </button>
          </div>
        </div>
      )}

      <a
        href="#/landing"
        aria-label="MANAS360 Home"
        onClick={(event) => {
          event.preventDefault();
          navigate('/landing');
        }}
        style={{
          position: "absolute",
          left: "8px",
          top: "56px",
          zIndex: 95,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "104px",
          height: "104px",
          borderRadius: "24px",
          padding: "10px",
          boxSizing: "border-box",
          overflow: "hidden",
          background: "rgba(255,255,255,0.82)",
          border: "1px solid rgba(226, 232, 240, 0.95)",
          backdropFilter: "blur(6px)",
          boxShadow: "0 10px 28px rgba(0,0,0,0.12)",
          textDecoration: "none",
        }}
      >
        <img src="/Logo.jpeg" alt="MANAS360" style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", display: "block", borderRadius: "12px", background: "#FFFFFF" }} />
      </a>
      <div
        className="left-dock-wrap"
        style={{
          position: "fixed",
          left: 0,
          top: "120px",
          transform: "none",
          zIndex: 95,
          display: "flex",
          alignItems: "center"
        }}
        onMouseEnter={openLeftPanel}
        onMouseLeave={closeLeftPanelWithDelay}
      >
        <div
          className="floating-left-dock"
          style={{
            background: "rgba(255,255,255,0.88)",
            border: "1px solid #E1E8F0",
            borderLeft: "none",
            borderRadius: "0 18px 18px 0",
            padding: "10px 8px 10px 6px",
            boxShadow: "0 14px 36px rgba(15, 23, 42, 0.14)",
            backdropFilter: "blur(10px)",
            width: "56px"
          }}
        >
          {[
            { id: "bot", icon: "🤖", bg: "linear-gradient(180deg, #EFE7FF, #E6EEFF)", dot: true },
            { id: "pets", icon: "🐾", bg: "linear-gradient(180deg, #EFE7FF, #ECE9FF)" },
            { id: "sound", icon: "🎵", bg: "linear-gradient(180deg, #DDF3EC, #E3F0FF)" },
            { id: "divider-1", divider: true },
            { id: "schedule", icon: "🗓️", bg: "linear-gradient(180deg, #DDF3EC, #E3F0FF)" },
            { id: "chat-mid", icon: "💬", bg: "linear-gradient(180deg, #DDF3EC, #E6EDF8)" },
            { id: "divider-2", divider: true },
            { id: "notes", icon: "📋", bg: "linear-gradient(180deg, #E6F0FF, #E9EEF8)" },
            { id: "brain", icon: "🧠", bg: "linear-gradient(180deg, #FDE7EF, #F4E8FF)" }
          ].map((item) => {
            if (item.divider) {
              return <div key={item.id} style={{ height: "1px", background: "#D7DEE8", margin: "8px 6px" }} />;
            }

            return (
              <button
                key={item.id}
                type="button"
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "11px",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  margin: "4px 2px",
                  background: item.bg,
                  fontSize: "18px",
                  position: "relative"
                }}
                aria-label="Quick item"
              >
                <span>{item.icon}</span>
                {item.dot ? (
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "2px",
                      width: "7px",
                      height: "7px",
                      borderRadius: "999px",
                      background: "#22C55E",
                      border: "1.5px solid #FFFFFF"
                    }}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          className="left-dock-panel"
          style={{
            width: leftPanelOpen ? "272px" : "0px",
            opacity: leftPanelOpen ? 1 : 0,
            overflow: "hidden",
            transform: leftPanelOpen ? "translateX(0)" : "translateX(-8px)",
            transition: "width 0.22s ease, opacity 0.18s ease, transform 0.22s ease",
            pointerEvents: leftPanelOpen ? "auto" : "none"
          }}
        >
          <div
            style={{
              marginLeft: "8px",
              background: "rgba(255,255,255,0.92)",
              border: "1px solid #E1E8F0",
              borderRadius: "0 20px 20px 0",
              boxShadow: "0 18px 40px rgba(15,23,42,0.16)",
              padding: "12px 12px 10px",
              maxHeight: "76vh",
              overflowY: "auto"
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "2px", color: "#0B2D5E", marginBottom: "7px" }}>QUICK ACCESS</div>

            {[
              { icon: "\uD83E\uDD16", title: "AnytimeBUDDY", text: "Your 24/7 AI companion", tag: "LIVE" },
              { icon: "\uD83D\uDC3E", title: "Digital Pets", text: "Oxytocin \u2022 Serotonin \u2022 Dopamine", tag: "NEW" },
              { icon: "\uD83C\uDFA7", title: "Sound Therapy", text: "Sleep, calm, focus" }
            ].map((row) => (
              <div key={row.title} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "linear-gradient(180deg,#ECF4F1,#DFE8F1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "21px", flexShrink: 0 }}>{row.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "17px", color: "#2B3345", lineHeight: 1.05 }}>
                    {row.tag ? <span style={{ fontSize: "10px", fontWeight: 800, color: "#0A8F4D", background: "#DCFCE7", borderRadius: "999px", padding: "2px 6px", marginRight: "6px", verticalAlign: "middle" }}>{row.tag}</span> : null}
                    <span style={{ fontSize: "17px", fontWeight: 800, color: "#1F2937", verticalAlign: "middle" }}>{row.title}</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.text}</div>
                </div>
              </div>
            ))}

            <div style={{ height: "1px", background: "#D7DEE8", margin: "10px 2px" }} />
            <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "2px", color: "#0B2D5E", marginBottom: "7px" }}>WHATSAPP</div>

            {[
              { icon: "\uD83D\uDCC5", title: "WA Book Session", text: "Book therapist via WhatsApp" },
              { icon: "\uD83D\uDCAC", title: "WA Session", text: "Text-based therapy chat" }
            ].map((row) => (
              <div key={row.title} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "7px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "linear-gradient(180deg,#ECF4F1,#DFE8F1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "21px", flexShrink: 0 }}>{row.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#1F2937", lineHeight: 1.1 }}>{row.title}</div>
                  <div style={{ fontSize: "11px", color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.text}</div>
                </div>
              </div>
            ))}

            <div style={{ height: "1px", background: "#D7DEE8", margin: "10px 2px" }} />
            <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "2px", color: "#0B2D5E", marginBottom: "7px" }}>FREE TOOLS</div>

            {[
              { icon: "\uD83D\uDCDD", title: "Free Screening", text: "PHQ-9 \u2022 GAD-7 \u2022 3 min" },
              { icon: "\uD83E\uDDE0", title: "AI Self-Service", text: "CBT \u2022 Journaling \u2022 Mood" }
            ].map((row) => (
              <div key={row.title} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "7px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "12px", background: "linear-gradient(180deg,#ECF4F1,#DFE8F1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "21px", flexShrink: 0 }}>{row.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "15px", fontWeight: 800, color: "#1F2937", lineHeight: 1.1 }}>{row.title}</div>
                  <div style={{ fontSize: "11px", color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="floating-right-avatars" 
        style={{
          position: "fixed",
          right: "18px",
          top: "168px",
          zIndex: 160,
          display: "flex",
          flexDirection: "column",
          gap: "14px"
        }}
      >
        {[
          { bg: "#FFF", image: "/AnytimeBUDDY.jpeg", label: "Doctor" },
          { bg: "#111827", image: "/HitASixer.jpeg", label: "Cricket", href: "/hit-a-sixer" },
          { bg: "#03163A", image: "/Digital-Pet-Hub.png", label: "Digital Pet", href: "/pet" }
        ].map((item, idx) => (
          <div
            key={idx}
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "999px",
              background: item.bg,
              border: "5px solid rgba(255,255,255,0.9)",
              boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: item.href ? "pointer" : "default",
              animation: `avatarFloat 3.8s ease-in-out ${idx * 0.35}s infinite`
            }}
            role={item.href ? "button" : undefined}
            tabIndex={item.href ? 0 : undefined}
            onClick={() => {
              if (item.href) {
                navigate(item.href);
              }
            }}
            onKeyDown={(e) => {
              if (item.href && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                navigate(item.href);
              }
            }}
            aria-hidden
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.label}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  objectPosition: "center",
                  display: "block",
                  borderRadius: "999px",
                  background: item.bg
                }}
              />
            ) : (
              <span style={{ fontSize: "24px" }}>{item.label}</span>
            )}
          </div>
        ))}
      </div>

      <div style={{ position: "fixed", right: "24px", bottom: "24px", zIndex: 120 }}>
        <button
          type="button"
          style={{
            width: "62px",
            height: "62px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(135deg, #7C3AED, #5B21B6)",
            boxShadow: "0 16px 36px rgba(0,0,0,0.22)",
            color: "white",
            position: "relative",
            animation: "chatFloat 3.2s ease-in-out infinite"
          }}
          aria-label="Chat"
        >
          <span style={{ fontSize: "30px", display: "inline-block", transform: "rotate(0deg)", animation: "chatTilt 3s ease-in-out infinite" }}>&#129302;</span>
          <span
            style={{
              position: "absolute",
              top: "-8px",
              left: "-7px",
              width: "18px",
              height: "18px",
              borderRadius: "999px",
              background: "#EF4444",
              color: "white",
              fontSize: "11px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid rgba(255,255,255,0.9)"
            }}
          >
            3
          </span>
          <span
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              width: "14px",
              height: "14px",
              borderRadius: "999px",
              background: "#22C55E",
              border: "2px solid rgba(255,255,255,0.95)"
            }}
            aria-hidden
          />
        </button>
      </div>

      <div className="brand-bar">
        <div style={{ maxWidth: "1260px", margin: "0 auto", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}>
              {(["English", "Hindi", "Kannada", "Tamil", "Telugu"] as const).map((lang) => {
                const active = selectedLanguage === lang;
                return (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setSelectedLanguage(lang)}
                    style={{
                      border: "1px solid #E8EDF2",
                      background: active ? "#0B2D5E" : "white",
                      color: active ? "white" : "#1A1A2E",
                      fontSize: "11px",
                      fontWeight: 800,
                      padding: "6px 12px",
                      borderRadius: "16px",
                      cursor: "pointer"
                    }}
                  >
                    {languageLabelMap[lang]}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 14px",
                  borderRadius: "18px",
                  border: "1px solid #D5DEE9",
                  cursor: "pointer",
                  background: "#F8FBFF",
                  minWidth: "214px"
                }}
              >
                <span style={{ fontSize: "14px", color: "#2563EB" }}>&#128269;</span>
                <span style={{ fontSize: "11px", color: "#64748B", flex: 1, textAlign: "left", fontWeight: 700 }}>Search or ask...</span>
                <span
                  style={{
                    fontSize: "10px",
                    color: "#64748B",
                    background: "#FFFFFF",
                    border: "1px solid #DDE5EF",
                    padding: "2px 7px",
                    borderRadius: "8px"
                  }}
                >
                  ⌘ K
                </span>
              </button>

              <button
                type="button"
                style={{
                  background: "#0B2D5E",
                  color: "white",
                  padding: "9px 20px",
                  borderRadius: "18px",
                  fontSize: "12px",
                  fontWeight: 900,
                  cursor: "pointer",
                  border: "none",
                  whiteSpace: "nowrap"
                }}
              >
                Subscribe
              </button>

              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setLoginDropdownOpen(!loginDropdownOpen)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0px",
                    padding: "9px 18px",
                    borderRadius: "18px",
                    border: "1px solid #D5DEE9",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 800,
                    color: "#1A1A2E",
                    background: "white",
                    whiteSpace: "nowrap"
                  }}
                >
                  Log In
                </button>

                {loginDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 8px)",
                      right: 0,
                      background: "white",
                      borderRadius: "12px",
                      boxShadow: "0 14px 50px rgba(0, 0, 0, 0.14)",
                      padding: "6px",
                      width: "248px",
                      zIndex: 150,
                      border: "1px solid #E8EDF2"
                    }}
                  >
                    {loginOptions.map((option) => (
                      <div
                        key={option.type}
                        onClick={() => handleLogin(option.type)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 10px",
                          borderRadius: "9px",
                          cursor: "pointer",
                          transition: "background 0.15s"
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "#FAFCFF";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}
                      >
                        <span style={{ fontSize: "17px", width: "24px", textAlign: "center" }}>{option.icon}</span>
                        <div>
                          <div style={{ fontSize: "12px", fontWeight: 900, color: "#1A1A2E" }}>{option.label}</div>
                          <div style={{ fontSize: "10px", color: "#666680", marginTop: "1px" }}>{option.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "6px" }}>
                {[
                  { key: "wa", label: "◔" },
                  { key: "ig", label: "◌" },
                  { key: "yt", label: "▶" },
                  { key: "in", label: "in" }
                ].map((s) => (
                  <div
                    key={s.key}
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "7px",
                      background: "transparent",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 900,
                      color: "#66708A"
                    }}
                    aria-hidden
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "10px 0 14px 0",
              borderTop: "1px solid rgba(232, 237, 242, 0.7)"
            }}
          >
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
                              cursor:
                                activeQuickNav === "I Need a Helping Hand" ||
                                activeQuickNav === "AI Power Hub" ||
                                activeQuickNav === "Find a Spark Again" ||
                                activeQuickNav === "Self-Help Tools" ||
                                activeQuickNav === "For Corporates / Edu / Healthcare" ||
                                activeQuickNav === "Premium Therapy Hub" ||
                                activeQuickNav === "MyDigitalClinic" ||
                                activeQuickNav === "Certify2EarnMore" ||
                                activeQuickNav === "Digital Pets4Happy Hormones"
                                  ? "pointer"
                                  : "default"
                            }}
                            role={
                              activeQuickNav === "I Need a Helping Hand" ||
                              activeQuickNav === "AI Power Hub" ||
                              activeQuickNav === "Find a Spark Again" ||
                              activeQuickNav === "Self-Help Tools" ||
                              activeQuickNav === "For Corporates / Edu / Healthcare" ||
                              activeQuickNav === "Premium Therapy Hub" ||
                              activeQuickNav === "MyDigitalClinic" ||
                              activeQuickNav === "Certify2EarnMore" ||
                              activeQuickNav === "Digital Pets4Happy Hormones"
                                ? "button"
                                : undefined
                            }
                            tabIndex={
                              activeQuickNav === "I Need a Helping Hand" ||
                              activeQuickNav === "AI Power Hub" ||
                              activeQuickNav === "Find a Spark Again" ||
                              activeQuickNav === "Self-Help Tools" ||
                              activeQuickNav === "For Corporates / Edu / Healthcare" ||
                              activeQuickNav === "Premium Therapy Hub" ||
                              activeQuickNav === "MyDigitalClinic" ||
                              activeQuickNav === "Certify2EarnMore" ||
                              activeQuickNav === "Digital Pets4Happy Hormones"
                                ? 0
                                : undefined
                            }
                            onClick={() => handleQuickNavMegaItemClick(activeQuickNav, mi.title)}
                            onKeyDown={(e) => {
                              if (
                                (activeQuickNav === "I Need a Helping Hand" ||
                                  activeQuickNav === "AI Power Hub" ||
                                  activeQuickNav === "Find a Spark Again" ||
                                  activeQuickNav === "Self-Help Tools" ||
                                  activeQuickNav === "For Corporates / Edu / Healthcare" ||
                                  activeQuickNav === "Premium Therapy Hub" ||
                                  activeQuickNav === "MyDigitalClinic" ||
                                  activeQuickNav === "Certify2EarnMore" ||
                                  activeQuickNav === "Digital Pets4Happy Hormones") &&
                                (e.key === "Enter" || e.key === " ")
                              ) {
                                e.preventDefault();
                                handleQuickNavMegaItemClick(activeQuickNav, mi.title);
                              }
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
          </div>
        </div>
      </div>




      <div style={{ textAlign: "center", padding: "24px 16px 72px 16px", maxWidth: "980px", margin: "48px auto 0" }}>
        <h1
          style={{
            fontSize: "56px",
            fontWeight: 900,
            color: "#0F172A",
            lineHeight: 1.05,
            margin: "16px 0 12px 0",
            fontFamily: "Georgia, 'Times New Roman', serif"
          }}
        >
          You're <span style={{ color: "#7F8000" }}>not alone</span>. Let's take
          <br />
          this <span style={{ color: "#7F8000" }}>together</span>.
        </h1>
        <p style={{ fontSize: "14px", color: "#334155", lineHeight: 1.6, margin: "0 0 8px 0", fontWeight: 600 }}>
          Feeling overwhelmed? Confused? That's okay. We'll help you
          <br />
          understand your feelings in a safe, quiet space.
        </p>
        <p style={{ fontSize: "12px", color: "#64748B", margin: "0 0 18px 0", fontWeight: 800 }}>Takes just 60 seconds.</p>

        <button
          type="button"
          onClick={handleScrollToAssess}
          style={{
            background: "white",
            color: "#0F172A",
            padding: "12px 26px",
            borderRadius: "999px",
            fontSize: "12px",
            fontWeight: 900,
            cursor: "pointer",
            border: "1px solid rgba(232, 237, 242, 0.95)",
            boxShadow: "0 12px 30px rgba(0, 0, 0, 0.08)",
            marginBottom: "16px"
          }}
        >
          START FREE SCREENING &rarr;
        </button>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "14px",
            flexWrap: "wrap",
            fontSize: "12px",
            fontWeight: 800,
            color: "#334155"
          }}
        >
          {["Confidential", "No Judgment", "Immediate"].map((t) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "#0B2D5E" }} />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </div>

      <section
        aria-label="For Mental Health Professionals"
        style={{
          background: "linear-gradient(180deg, rgba(207, 224, 235, 0.95) 0%, rgba(231, 243, 245, 0.9) 55%, rgba(255,255,255,0.95) 100%)",
          marginTop: "180px",
          padding: "42px 16px 18px 16px"
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              fontSize: "12px",
              fontWeight: 900,
              letterSpacing: "3px",
              textTransform: "uppercase",
              color: "#0B2D5E",
              marginBottom: "10px"
            }}
          >
            <span style={{ fontSize: "14px" }}>&#10022;</span>
            FOR MENTAL HEALTH PROFESSIONALS
          </div>

          <div
            style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontStyle: "italic",
              fontSize: "18px",
              fontWeight: 700,
              color: "#0B2D5E",
              opacity: 0.85,
              marginBottom: "18px"
            }}
          >
            Join India&apos;s growing network &mdash; Discover plans, create your profile, start earning
          </div>

          <div className="pro-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "18px" }}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/provider-landing')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate('/provider-landing');
                }
              }}
              style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(226,232,240,0.95)", borderRadius: "22px", padding: "18px 16px", boxShadow: "0 16px 40px rgba(0,0,0,0.07)", cursor: 'pointer' }}
            >
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "10px", fontWeight: 900, color: "white", background: "linear-gradient(135deg,#7C3AED,#A78BFA)", padding: "4px 8px", borderRadius: "999px" }}>RCI VERIFIED</span>
              </div>
              <div style={{ marginTop: "10px", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "92px", height: "92px", borderRadius: "999px", border: "2px dashed rgba(124,58,237,0.45)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(237,233,254,0.65)" }}>
                  <span style={{ fontSize: "34px" }}>&#129504;</span>
                </div>
              </div>
              <div style={{ marginTop: "14px", fontSize: "16px", fontWeight: 900, color: "#0F172A" }}>Psychologist</div>
              <div style={{ marginTop: "6px", fontSize: "12px", fontWeight: 700, color: "#64748B", lineHeight: 1.55 }}>Clinical &amp; counseling psychology. RCI registered. Earn ₹60K&ndash;₹2L/mo</div>
              <button type="button" onClick={() => navigate('/provider-landing')} style={{ marginTop: "14px", border: "1.5px solid rgba(124,58,237,0.7)", background: "rgba(255,255,255,0.95)", color: "#6D28D9", fontWeight: 900, fontSize: "12px", padding: "10px 14px", borderRadius: "999px", cursor: "pointer" }}>
                &#10022; Join Now
              </button>
              <div style={{ marginTop: "10px", fontSize: "11px", fontWeight: 800, color: "#64748B" }}>Discover &mdash; Plans &mdash; Profile</div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/provider-landing')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate('/provider-landing');
                }
              }}
              style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(226,232,240,0.95)", borderRadius: "22px", padding: "18px 16px", boxShadow: "0 16px 40px rgba(0,0,0,0.07)", cursor: 'pointer' }}
            >
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "10px", fontWeight: 900, color: "white", background: "linear-gradient(135deg,#0EA5A6,#22C1C3)", padding: "4px 8px", borderRadius: "999px" }}>NMC VERIFIED</span>
              </div>
              <div style={{ marginTop: "10px", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "92px", height: "92px", borderRadius: "999px", border: "2px dashed rgba(14,165,166,0.45)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(204,251,241,0.55)" }}>
                  <span style={{ fontSize: "34px" }}>&#128181;</span>
                </div>
              </div>
              <div style={{ marginTop: "14px", fontSize: "16px", fontWeight: 900, color: "#0F172A" }}>Psychiatrist</div>
              <div style={{ marginTop: "6px", fontSize: "12px", fontWeight: 700, color: "#64748B", lineHeight: 1.55 }}>Diagnosis, medication, e-prescriptions. NMC registered MDs</div>
              <button type="button" onClick={() => navigate('/provider-landing')} style={{ marginTop: "14px", border: "1.5px solid rgba(14,165,166,0.7)", background: "rgba(255,255,255,0.95)", color: "#0F766E", fontWeight: 900, fontSize: "12px", padding: "10px 14px", borderRadius: "999px", cursor: "pointer" }}>
                &#10022; Join Now
              </button>
              <div style={{ marginTop: "10px", fontSize: "11px", fontWeight: 800, color: "#64748B" }}>Discover &mdash; Plans &mdash; Profile</div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/provider-landing')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate('/provider-landing');
                }
              }}
              style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(226,232,240,0.95)", borderRadius: "22px", padding: "18px 16px", boxShadow: "0 16px 40px rgba(0,0,0,0.07)", cursor: 'pointer' }}
            >
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "10px", fontWeight: 900, color: "white", background: "linear-gradient(135deg,#16A34A,#22C55E)", padding: "4px 8px", borderRadius: "999px" }}>0% FEE &mdash; 3 MO</span>
              </div>
              <div style={{ marginTop: "10px", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "92px", height: "92px", borderRadius: "999px", border: "2px dashed rgba(34,197,94,0.45)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(220,252,231,0.6)" }}>
                  <span style={{ fontSize: "34px" }}>&#128154;</span>
                </div>
              </div>
              <div style={{ marginTop: "14px", fontSize: "16px", fontWeight: 900, color: "#0F172A" }}>Therapist</div>
              <div style={{ marginTop: "6px", fontSize: "12px", fontWeight: 700, color: "#64748B", lineHeight: 1.55 }}>CBT, DBT, REBT, integrative. Build your practice on your terms</div>
              <button type="button" onClick={() => navigate('/provider-landing')} style={{ marginTop: "14px", border: "1.5px solid rgba(34,197,94,0.7)", background: "rgba(255,255,255,0.95)", color: "#15803D", fontWeight: 900, fontSize: "12px", padding: "10px 14px", borderRadius: "999px", cursor: "pointer" }}>
                &#10022; Join Now
              </button>
              <div style={{ marginTop: "10px", fontSize: "11px", fontWeight: 800, color: "#64748B" }}>Discover &mdash; Plans &mdash; Profile</div>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/provider-landing')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate('/provider-landing');
                }
              }}
              style={{ background: "rgba(255,255,255,0.92)", border: "1px solid rgba(226,232,240,0.95)", borderRadius: "22px", padding: "18px 16px", boxShadow: "0 16px 40px rgba(0,0,0,0.07)", cursor: 'pointer' }}
            >
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <span style={{ fontSize: "10px", fontWeight: 900, color: "white", background: "linear-gradient(135deg,#D97706,#F59E0B)", padding: "4px 8px", borderRadius: "999px" }}>CERTIFIED</span>
              </div>
              <div style={{ marginTop: "10px", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "92px", height: "92px", borderRadius: "999px", border: "2px dashed rgba(245,158,11,0.45)", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(254, 243, 199, 0.7)" }}>
                  <span style={{ fontSize: "34px" }}>&#11088;</span>
                </div>
              </div>
              <div style={{ marginTop: "14px", fontSize: "16px", fontWeight: 900, color: "#0F172A" }}>NLP Coach</div>
              <div style={{ marginTop: "6px", fontSize: "12px", fontWeight: 700, color: "#64748B", lineHeight: 1.55 }}>Neuro-linguistic programming. Life coaching. Transformation specialists</div>
              <button type="button" onClick={() => navigate('/provider-landing')} style={{ marginTop: "14px", border: "1.5px solid rgba(245,158,11,0.75)", background: "rgba(255,255,255,0.95)", color: "#B45309", fontWeight: 900, fontSize: "12px", padding: "10px 14px", borderRadius: "999px", cursor: "pointer" }}>
                &#10022; Join Now
              </button>
              <div style={{ marginTop: "10px", fontSize: "11px", fontWeight: 800, color: "#64748B" }}>Discover &mdash; Plans &mdash; Profile</div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="assessSection"
        style={{
          background: "linear-gradient(180deg, rgba(207, 224, 235, 0.65) 0%, rgba(231, 243, 245, 0.75) 55%, rgba(255,255,255,0.98) 100%)",
          padding: "12px 16px 56px 16px"
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.92)",
              borderRadius: "28px",
              border: "1px solid rgba(226,232,240,0.9)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.10)",
              padding: "34px 32px"
            }}
          >
            <div className="assess-grid" style={{ display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: "26px", alignItems: "start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#16A34A" }} />
                  <span style={{ fontSize: "12px", fontWeight: 900, letterSpacing: "3px", textTransform: "uppercase", color: "#0B2D5E" }}>FREE MENTAL HEALTH CHECK-UP</span>
                </div>

                <div
                  style={{
                    fontFamily: "Georgia, 'Times New Roman', serif",
                    fontSize: "36px",
                    fontWeight: 800,
                    color: "#0F172A",
                    lineHeight: 1.15,
                    marginBottom: "14px"
                  }}
                >
                  Not sure where to start?
                  <br />
                  Take a <em style={{ fontStyle: "italic", color: "#0B2D5E" }}>free assessment</em> &mdash; your way.
                </div>

                <div style={{ fontSize: "14px", color: "#64748B", lineHeight: 1.7, fontWeight: 700, maxWidth: "640px" }}>
                  A quick PHQ-9 screening takes 3 minutes. Available in Hindi, Kannada, Tamil, Telugu &amp; English. Get your results instantly &mdash; no signup,
                  no charge, completely confidential.
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "18px", marginTop: "18px", fontSize: "12px", fontWeight: 800, color: "#334155" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "8px", background: "rgba(226,232,240,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                      &#128274;
                    </span>
                    100% Confidential
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "8px", background: "rgba(226,232,240,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                      &#127381;
                    </span>
                    Always Free
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "8px", background: "rgba(226,232,240,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                      &#127760;
                    </span>
                    5 Languages
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ width: "22px", height: "22px", borderRadius: "8px", background: "rgba(226,232,240,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                      &#9889;
                    </span>
                    Instant Results
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(226,232,240,0.95)",
                    borderRadius: "18px",
                    padding: "16px",
                    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px"
                  }}
                  onClick={() => {
                    // Placeholder
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "rgba(237,233,254,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                      &#128241;
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#0F172A" }}>In-App Check-In</div>
                      <div style={{ marginTop: "3px", fontSize: "12px", fontWeight: 700, color: "#64748B", lineHeight: 1.45 }}>
                        Emoji mood picker &bull; 60-second Vibe Check &bull; Track your streak
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 900,
                      padding: "8px 12px",
                      borderRadius: "999px",
                      background: "rgba(237,233,254,0.95)",
                      color: "#6D28D9",
                      whiteSpace: "nowrap"
                    }}
                  >
                    OPEN APP
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(255,255,255,0.95)",
                    border: "1px solid rgba(226,232,240,0.95)",
                    borderRadius: "18px",
                    padding: "16px",
                    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "14px"
                  }}
                  onClick={() => window.open("https://wa.me/919876543210", "_blank")}
                  role="button"
                  tabIndex={0}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "14px", background: "rgba(220,252,231,0.85)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
                      &#128172;
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#0F172A" }}>WhatsApp Assessment</div>
                      <div style={{ marginTop: "3px", fontSize: "12px", fontWeight: 700, color: "#64748B", lineHeight: 1.45 }}>
                        Chat-based PHQ-9 &bull; Reply at your pace &bull; Get PDF report
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 900,
                      padding: "8px 12px",
                      borderRadius: "999px",
                      background: "rgba(220,252,231,0.95)",
                      color: "#15803D",
                      whiteSpace: "nowrap"
                    }}
                  >
                    CHAT NOW
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Feature cards" style={{ padding: "0 16px 18px 16px" }}>
        <div style={{ maxWidth: "1260px", margin: "0 auto" }}>
          <div className="triple-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "16px" }}>
            <div
              style={{
                borderRadius: "18px",
                border: "2px solid rgba(245, 158, 11, 0.9)",
                background: "linear-gradient(135deg, rgba(255, 237, 213, 0.98), rgba(255, 247, 237, 0.9))",
                padding: "18px",
                boxShadow: "0 16px 40px rgba(0,0,0,0.08)",
                cursor: "pointer"
              }}
              role="button"
              tabIndex={0}
              onClick={() => navigate("/nri-landing")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate("/nri-landing");
                }
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 900, letterSpacing: "2px", textTransform: "uppercase", color: "#F97316" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#38BDF8" }} />
                FOR NRI & GLOBAL INDIAN COMMUNITY
              </div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#9A3412", lineHeight: 1.15, marginTop: "10px" }}>
                Find a <span style={{ fontStyle: "italic", fontFamily: "Georgia, 'Times New Roman', serif" }}>Janmabhoomi</span>
                <br />
                Connection &mdash; Heal with the Right Care
              </div>
              <div style={{ fontSize: "12px", color: "#7C2D12", lineHeight: 1.6, fontWeight: 700, marginTop: "10px" }}>
                Therapy in your mother tongue with Indian experts who understand NRI realities &mdash; career pressure abroad, family guilt, identity shifts,
                and relationships across continents.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                {["IST + Your Local Timezone", "Hindi · Tamil · Telugu · Kannada · English", "DPDPA-aligned care", "USD / GBP / AED / SGD accepted"].map((chip) => (
                  <div key={chip} style={{ fontSize: "10px", fontWeight: 900, color: "#9A3412", background: "rgba(255,255,255,0.65)", border: "1px solid rgba(251, 191, 36, 0.55)", padding: "4px 8px", borderRadius: "999px" }}>
                    {chip}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginTop: "12px" }}>
                <span style={{ fontSize: "12px", color: "#9A3412", fontWeight: 800 }}>NRI session model:</span>
                <span style={{ fontSize: "18px", fontWeight: 900, color: "#B45309" }}>from ₹2,999/session</span>
              </div>
              <button type="button" onClick={() => navigate("/nri-landing")} style={{ marginTop: "12px", width: "100%", border: "none", cursor: "pointer", borderRadius: "14px", padding: "12px 14px", background: "linear-gradient(135deg, #C2410C, #EA580C)", color: "white", fontWeight: 900, fontSize: "12px", boxShadow: "0 18px 40px rgba(0,0,0,0.12)" }}>
                IN Connect to Home &mdash; Book NRI Session &rarr;
              </button>
            </div>

            <div style={{ borderRadius: "18px", border: "2px solid rgba(34, 197, 94, 0.55)", background: "linear-gradient(135deg, rgba(220, 252, 231, 0.96), rgba(240, 253, 244, 0.92))", padding: "18px", boxShadow: "0 16px 40px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 900, letterSpacing: "2px", textTransform: "uppercase", color: "#15803D" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#A78BFA" }} />
                FOR PRACTICING THERAPISTS
              </div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#14532D", lineHeight: 1.15, marginTop: "10px" }}>MyDigitalClinic</div>
              <div style={{ fontSize: "12px", color: "#166534", lineHeight: 1.6, fontWeight: 700, marginTop: "10px" }}>
                Already have patients? Digitize your practice. Your patients, your records, your control. No marketplace. No patient-sharing.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                {["Session Notes", "Scheduling", "Prescriptions", "PHQ-9 Tracking", "DPDPA"].map((chip) => (
                  <div key={chip} style={{ fontSize: "10px", fontWeight: 900, color: "#14532D", background: "rgba(255,255,255,0.65)", border: "1px solid rgba(34, 197, 94, 0.35)", padding: "4px 8px", borderRadius: "999px" }}>
                    {chip}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
                <span style={{ fontSize: "10px", fontWeight: 900, color: "white", background: "rgba(21, 128, 61, 0.9)", padding: "5px 10px", borderRadius: "999px" }}>21 DAYS FREE</span>
                <span style={{ fontSize: "12px", fontWeight: 900, color: "#166534" }}>Pick only modules you need &mdash; from &#8377;99/mo</span>
              </div>
              <button type="button" onClick={() => navigate("/my-digital-clinic")} style={{ marginTop: "12px", width: "100%", border: "none", cursor: "pointer", borderRadius: "14px", padding: "12px 14px", background: "linear-gradient(135deg, #14532D, #1F7A3D)", color: "white", fontWeight: 900, fontSize: "12px", boxShadow: "0 18px 40px rgba(0,0,0,0.12)" }}>
                Configure My Clinic &rarr;
              </button>
            </div>

            <div style={{ borderRadius: "18px", border: "2px solid rgba(99, 102, 241, 0.6)", background: "linear-gradient(135deg, rgba(224, 231, 255, 0.98), rgba(245, 243, 255, 0.9))", padding: "18px", boxShadow: "0 16px 40px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: 900, letterSpacing: "2px", textTransform: "uppercase", color: "#7C3AED" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "999px", background: "#111827" }} />
                DIGITAL COMPANIONS
              </div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: "#4C1D95", lineHeight: 1.15, marginTop: "10px" }}>
                Meet Your Healing
                <br />
                Companions
              </div>
              <div style={{ fontSize: "12px", color: "#6D28D9", lineHeight: 1.6, fontWeight: 700, marginTop: "10px" }}>Nurture a companion that grows with your wellness journey.</div>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px", background: "rgba(255,255,255,0.7)", border: "1px solid rgba(99, 102, 241, 0.25)", padding: "10px", borderRadius: "14px" }}>
                {[{ name: "Baby Dino", sub: "Oxytocin", icon: "\uD83E\uDD96" }, { name: "Retriever", sub: "Serotonin", icon: "\uD83D\uDC36" }, { name: "Elephant", sub: "Dopamine", icon: "\uD83D\uDC18" }, { name: "Chintu", sub: "Endorphins", icon: "\uD83D\uDC31" }].map((p) => (
                  <div key={p.name} style={{ flex: "1 1 110px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "12px", background: "rgba(124,58,237,0.10)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{p.icon}</div>
                    <div>
                      <div style={{ fontSize: "11px", fontWeight: 900, color: "#4C1D95" }}>{p.name}</div>
                      <div style={{ fontSize: "10px", fontWeight: 900, color: "#6D28D9" }}>{p.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#6D28D9", marginTop: "10px" }}>&bull; Oxytocin (love) &bull; Serotonin (happy) &bull; Dopamine (reward) &bull; Endorphins (energy)</div>
              <button type="button" onClick={() => navigate("/pet")} style={{ marginTop: "12px", width: "100%", border: "none", cursor: "pointer", borderRadius: "14px", padding: "12px 14px", background: "linear-gradient(135deg, #6D28D9, #7C3AED)", color: "white", fontWeight: 900, fontSize: "12px", boxShadow: "0 18px 40px rgba(0,0,0,0.12)" }}>Name Your Pet &mdash; Adopt FREE</button>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Live and upcoming group sessions" style={{ padding: "10px 16px 60px 16px" }}>
        <div style={{ maxWidth: "1260px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "18px" }}>&#128293;</span>
              <span style={{ fontSize: "16px", fontWeight: 900, color: "#0F172A" }}>Live &amp; Upcoming Group Sessions</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 900, color: "#EF4444", background: "rgba(254, 226, 226, 0.9)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "4px 8px", borderRadius: "999px" }}>
                {`${liveCards.filter((card) => String(card.rightBadge).includes("LIVE")).length} LIVE NOW`}
              </span>
              <button
                type="button"
                onClick={() => navigate('/group-therapy')}
                style={{ border: "1px solid rgba(15, 23, 42, 0.2)", background: "white", color: "#0F172A", fontWeight: 900, fontSize: "11px", padding: "6px 10px", borderRadius: "999px", cursor: "pointer" }}
              >
                View More
              </button>
            </div>
          </div>

          <div className="live-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px" }}>
            {liveCards.map((card) => (
              <div
                key={card.id || card.title}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/group-therapy')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/group-therapy');
                  }
                }}
                style={{ borderRadius: "18px", border: "1px solid rgba(239, 68, 68, 0.55)", background: "rgba(255, 255, 255, 0.78)", boxShadow: "0 18px 55px rgba(0,0,0,0.10)", overflow: "hidden", cursor: "pointer" }}
              >
                <div style={{ padding: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{ width: "26px", height: "26px", borderRadius: "999px", background: "rgba(226, 232, 240, 0.75)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>{card.icon}</div>
                      <div style={{ fontSize: "14px", fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>{card.title}</div>
                    </div>
                    <div style={{ fontSize: "10px", fontWeight: 900, color: "#EF4444", background: "rgba(254, 226, 226, 0.9)", border: "1px solid rgba(239, 68, 68, 0.22)", padding: "5px 10px", borderRadius: "999px", whiteSpace: "nowrap" }}>{card.rightBadge}</div>
                  </div>

                  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "34px", height: "34px", borderRadius: "999px", background: "rgba(186, 230, 253, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>&#128100;</div>
                    <div>
                      <div style={{ fontSize: "12px", fontWeight: 900, color: "#0F172A" }}>{card.doctor}</div>
                      <div style={{ marginTop: "2px", fontSize: "11px", fontWeight: 800, color: "#64748B" }}>{card.language}</div>
                    </div>
                  </div>

                  <div style={{ marginTop: "10px", fontSize: "11px", fontWeight: 900, color: "#EF4444" }}>{card.seats}</div>
                </div>

                <div style={{ padding: "12px" }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/group-therapy');
                    }}
                    style={{ width: "100%", border: "none", cursor: "pointer", borderRadius: "12px", padding: "10px 12px", background: card.buttonBg, color: "white", fontWeight: 900, fontSize: "12px", boxShadow: "0 14px 30px rgba(0,0,0,0.12)" }}
                  >
                    {card.buttonText}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer aria-label="Footer" style={{ background: "linear-gradient(180deg, #0B2D5E 0%, #06203F 100%)", color: "white", padding: "54px 16px 18px 16px" }}>
        <div style={{ maxWidth: "1260px", margin: "0 auto" }}>
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: "28px", alignItems: "start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "14px", background: "rgba(255,255,255,0.95)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src="/Logo.jpeg" alt="MANAS360" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                </div>
              </div>
              <div style={{ fontSize: "13px", fontWeight: 800, opacity: 0.9, lineHeight: 1.6 }}>Holistic Mental Wellness<br />Anytime, Anywhere</div>
              <div style={{ marginTop: "14px", fontSize: "11px", opacity: 0.75, fontWeight: 700, lineHeight: 1.7 }}>MANAS360 Mental Wellness Pvt. Ltd.<br />Bengaluru, Karnataka, India</div>
            </div>

            <div>
              <div style={{ fontSize: "13px", fontWeight: 900, color: "#C7D2FE", marginBottom: "10px" }}>Quick Links</div>
              {["About Us", "How It Works", "Specialized Care", "For Providers", "MyDigitalClinic", "Careers"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleFooterRoute(footerQuickLinkRoutes, t)}
                  style={{
                    fontSize: "12px",
                    opacity: 0.85,
                    marginBottom: "8px",
                    fontWeight: 700,
                    display: "block",
                    border: "none",
                    background: "transparent",
                    color: "inherit",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div>
              <div style={{ fontSize: "13px", fontWeight: 900, color: "#C7D2FE", marginBottom: "10px" }}>Legal</div>
              {["Privacy Policy", "Terms of Service", "Cookie Policy", "DPDPA Compliance", "Refund Policy", "Disclaimer"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleFooterRoute(footerLegalRoutes, t)}
                  style={{
                    fontSize: "12px",
                    opacity: 0.85,
                    marginBottom: "8px",
                    fontWeight: 700,
                    display: "block",
                    border: "none",
                    background: "transparent",
                    color: "inherit",
                    padding: 0,
                    cursor: "pointer",
                    textAlign: "left"
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div>
              <div style={{ fontSize: "13px", fontWeight: 900, color: "#C7D2FE", marginBottom: "10px" }}>Get in Touch</div>
              <a
                href="mailto:support@manas360.com"
                style={{ fontSize: "12px", opacity: 0.9, marginBottom: "8px", fontWeight: 800, display: "block", color: "inherit", textDecoration: "none" }}
              >
                &#9993; support@manas360.com
              </a>
              <a
                href="tel:+918867736009"
                style={{ fontSize: "12px", opacity: 0.9, marginBottom: "8px", fontWeight: 800, display: "block", color: "inherit", textDecoration: "none" }}
              >
                &#9742; +91-8867736009
              </a>
              <div style={{ fontSize: "12px", opacity: 0.9, marginBottom: "14px", fontWeight: 800 }}>&#128172; WhatsApp Support</div>
              <div style={{ display: "flex", gap: "10px", opacity: 0.85 }}>{["wa", "ig", "in", "x"].map((s) => (
                <div key={s} style={{ width: "28px", height: "28px", borderRadius: "8px", background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 900 }}>{s}</div>
              ))}</div>
            </div>
          </div>

          <div style={{ marginTop: "28px", border: "1px solid rgba(248, 113, 113, 0.35)", background: "rgba(248, 113, 113, 0.08)", borderRadius: "12px", padding: "12px 14px", textAlign: "center", fontSize: "12px", fontWeight: 900 }}>
            In Crisis? Call KIRAN: 1800-599-0019 (24/7, Free) &middot; iCall: 9152987821 &middot; Vandrevala: 1860-2662-345
          </div>

          <div style={{ marginTop: "18px", textAlign: "center", fontSize: "11px", opacity: 0.75, fontWeight: 700, lineHeight: 1.6 }}>
            &copy; 2026 MANAS360 Mental Wellness Pvt. Ltd. All rights reserved &middot; Bengaluru, Karnataka, India
            <br />
            MANAS360 is a technology aggregator platform.
          </div>
        </div>
      </footer>

      {showSearch && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.45)",
            zIndex: 200,
            display: "flex",
            justifyContent: "center",
            paddingTop: "80px"
          }}
          onClick={() => setShowSearch(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              width: "92%",
              maxWidth: "580px",
              maxHeight: "68vh",
              overflow: "hidden",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.22)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "13px 16px", borderBottom: "1px solid #E8EDF2" }}>
              <span style={{ fontSize: "16px", color: "#666680" }}>&#128270;</span>
              <input
                type="text"
                placeholder="Try 'couples therapy' or 'I feel anxious'..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  border: "none",
                  outline: "none",
                  fontSize: "14px",
                  fontFamily: "\"DM Sans\", sans-serif",
                  color: "#1A1A2E",
                  background: "transparent"
                }}
              />
              <span
                onClick={() => setShowSearch(false)}
                style={{
                  fontSize: "11px",
                  color: "#666680",
                  background: "#E8EDF2",
                  padding: "2px 8px",
                  borderRadius: "5px",
                  cursor: "pointer"
                }}
              >
                ESC
              </span>
            </div>
            <div style={{ padding: "12px 16px", maxHeight: "52vh", overflowY: "auto" }}>
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "#666680",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  marginBottom: "12px"
                }}
              >
                People often search for
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {["I feel anxious", "couples therapy", "psychiatrist", "group sessions", "free screening"].map((tag) => (
                  <div
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "20px",
                      border: "1px solid #E8EDF2",
                      fontSize: "11.5px",
                      color: "#3D3D5C",
                      cursor: "pointer",
                      transition: "all 0.15s"
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "#E8EEF7";
                      (e.currentTarget as HTMLElement).style.borderColor = "#0B2D5E";
                      (e.currentTarget as HTMLElement).style.color = "#0B2D5E";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.borderColor = "#E8EDF2";
                      (e.currentTarget as HTMLElement).style.color = "#3D3D5C";
                    }}
                  >
                    {tag}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .brand-bar {
          background: white;
          border-bottom: 1px solid transparent;
          position: relative;
          z-index: 90;
          transition: all 0.3s ease;
        }
        .brand-bar.scrolled {
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(14px);
          border-bottom-color: #e2e8f0;
          box-shadow: 0 1px 10px rgba(0, 0, 0, 0.04);
        }
                @keyframes avatarFloat {
                  0% { transform: translateY(0px); }
                  50% { transform: translateY(-7px); }
                  100% { transform: translateY(0px); }
                }
                @keyframes chatFloat {
                  0% { transform: translateY(0px); }
                  50% { transform: translateY(-10px); }
                  100% { transform: translateY(0px); }
                }
                @keyframes chatTilt {
                  0% { transform: rotate(0deg); }
                  72% { transform: rotate(0deg); }
                  82% { transform: rotate(-10deg); }
                  92% { transform: rotate(10deg); }
                  100% { transform: rotate(0deg); }
                }
                .quick-nav {
                  flex-wrap: nowrap;
                  white-space: nowrap;
                  width: 100%;
                  max-width: 100%;
                  min-width: 0;
                  overflow-x: auto;
                  overflow-y: hidden;
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
                .quick-nav::-webkit-scrollbar {
                  display: none;
                }
        @media (max-width: 980px) {
          .live-grid {
            grid-template-columns: 1fr;
          }
          .assess-grid {
            grid-template-columns: 1fr;
          }
          .triple-grid {
            grid-template-columns: 1fr;
          }
          .footer-grid {
            grid-template-columns: 1fr;
          }
          .pro-grid {
            grid-template-columns: 1fr 1fr;
          }
           .left-dock-wrap,
          .floating-left-dock,
          .floating-right-avatars {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
  
export default LandingPage;

