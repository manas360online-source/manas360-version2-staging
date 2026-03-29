/* eslint-disable no-useless-escape */

export const wireframeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>MANAS360 — Certification Program Journey Wireframe</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#0c0e16;--card:#141723;--border:#1e2236;
  --accent:#00b894;--blue:#4a6cf7;--red:#e74c3c;
  --gold:#f0b429;--orange:#e67e22;--purple:#9b59b6;
  --teal:#0e7c7b;--text:#e0ddd8;--muted:#6b7a96;--white:#fff;
  --cert-gradient:linear-gradient(135deg,#f0b429 0%,#e67e22 50%,#d35400 100%);
}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--bg);color:var(--text);height:100vh;overflow:hidden;display:flex;flex-direction:column}

/* ——— HEADER ——— */
.header{padding:16px 28px;background:#0f1119;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.header-left{display:flex;align-items:center;gap:14px}
.header-logo{width:36px;height:36px;background:var(--cert-gradient);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:#000}
.header h1{font-size:15px;font-weight:700;color:var(--white);letter-spacing:-.2px}
.header h1 span{color:var(--gold);font-weight:500}
.header-meta{font-size:11px;color:var(--muted);display:flex;gap:16px;align-items:center}
.header-meta .badge{background:#2a2210;color:var(--gold);padding:3px 10px;border-radius:12px;font-size:10px;font-weight:600;letter-spacing:.5px}

/* ——— PHASE NAV ——— */
.phase-nav{padding:12px 28px;background:#0f1119;border-bottom:1px solid var(--border);display:flex;gap:4px;flex-shrink:0;overflow-x:auto}
.phase-btn{padding:8px 16px;background:none;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:11px;font-weight:500;cursor:pointer;transition:all .15s;white-space:nowrap;font-family:inherit;display:flex;align-items:center;gap:6px}
.phase-btn:hover{background:#1a1d2e;color:var(--text);border-color:#2a2d3e}
.phase-btn.active{background:linear-gradient(135deg,#2a2210,#1a1510);color:var(--gold);border-color:var(--gold)}
.phase-btn .phase-num{font-size:9px;background:#1a1d2e;padding:2px 6px;border-radius:4px;font-weight:700;font-family:'JetBrains Mono',monospace}
.phase-btn.active .phase-num{background:#3a2a10}

/* ——— FLOW AREA ——— */
.flow-area{flex:1;overflow-x:auto;overflow-y:auto;padding:28px;display:flex;gap:16px;align-items:flex-start}
.flow-area::-webkit-scrollbar{height:6px}
.flow-area::-webkit-scrollbar-track{background:#0f1119}
.flow-area::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}

/* ——— PHONE MOCK ——— */
.phone{width:272px;flex-shrink:0;background:var(--card);border:1px solid var(--border);border-radius:20px;overflow:hidden;transition:all .25s;position:relative}
.phone:hover{border-color:var(--gold);box-shadow:0 0 30px rgba(240,180,41,.08)}
.phone-status{padding:6px 14px;background:#0a0c14;display:flex;justify-content:space-between;align-items:center;font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace}
.phone-header{padding:8px 14px;background:#0f1119;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border)}
.phone-header .screen-id{font-size:10px;color:var(--gold);letter-spacing:1.5px;font-weight:700;font-family:'JetBrains Mono',monospace}
.phone-header .story-ref{font-size:9px;color:var(--accent);background:#0a2a1a;padding:2px 8px;border-radius:4px;font-family:'JetBrains Mono',monospace}
.phone-title{padding:12px 14px;font-size:14px;font-weight:700;color:var(--white);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.phone-body{padding:14px;min-height:200px}
.phone-footer{padding:10px 14px;border-top:1px solid var(--border);display:flex;gap:6px;flex-direction:column}

/* ——— FLOW ARROW ——— */
.flow-arrow{display:flex;align-items:center;color:#2a2d3e;font-size:20px;align-self:center;flex-shrink:0;padding:0 2px;position:relative}
.flow-arrow::after{content:'';position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:6px;height:6px;background:var(--gold);border-radius:50%;opacity:.4}

/* ——— UI ELEMENTS ——— */
.mock-input{width:100%;padding:8px 10px;background:#0a0c14;border:1px solid var(--border);border-radius:8px;color:var(--muted);font-size:11px;margin-bottom:6px;font-family:'DM Sans',sans-serif}
.mock-row{display:flex;gap:6px;margin-bottom:6px}
.mock-row .mock-input{flex:1}
.mock-label{font-size:10px;color:var(--muted);margin-bottom:4px;display:block;letter-spacing:.5px;text-transform:uppercase;font-weight:500}
.mock-card{background:#0f1119;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:6px;transition:border-color .15s}
.mock-card:hover{border-color:#2a2d3e}
.card-title{font-size:12px;font-weight:600;color:var(--text);margin-bottom:3px}
.card-sub{font-size:10px;color:var(--muted);line-height:1.5}
.card-badge{display:inline-block;font-size:9px;padding:2px 8px;border-radius:5px;margin-top:4px;font-weight:600;letter-spacing:.3px}
.badge-green{background:#0a2a1a;color:#00b894}
.badge-blue{background:#0f1a3a;color:#4a6cf7}
.badge-orange{background:#2a1a08;color:#e67e22}
.badge-red{background:#2a0a0a;color:#e74c3c}
.badge-purple{background:#1a0a2a;color:#9b59b6}
.badge-gold{background:#2a2210;color:#f0b429}
.badge-teal{background:#0a2a2a;color:#0e7c7b}

.btn{padding:7px 14px;border:none;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif}
.btn:hover{transform:translateY(-1px)}
.btn-primary{background:var(--accent);color:#000}
.btn-secondary{background:var(--border);color:var(--text)}
.btn-danger{background:var(--red);color:var(--white)}
.btn-gold{background:var(--gold);color:#000}
.btn-blue{background:var(--blue);color:var(--white)}
.btn-purple{background:var(--purple);color:var(--white)}
.btn-small{padding:4px 8px;font-size:10px}
.btn-block{width:100%;text-align:center;margin-bottom:4px}

.divider{height:1px;background:var(--border);margin:8px 0}

.stat-row{display:flex;gap:6px;margin-bottom:6px}
.stat-box{flex:1;background:#0a0c14;border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center}
.stat-box .stat-num{font-size:17px;font-weight:700;color:var(--gold);font-family:'JetBrains Mono',monospace}
.stat-box .stat-label{font-size:9px;color:var(--muted);margin-top:2px}

.progress-bar{height:6px;background:#1a1d2e;border-radius:3px;overflow:hidden;margin:6px 0}
.progress-bar .fill{height:100%;border-radius:3px;transition:width .3s}

/* ——— SCREEN COUNTER ——— */
.screen-counter{position:fixed;bottom:20px;right:28px;background:#0f1119;border:1px solid var(--border);border-radius:10px;padding:8px 16px;font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;z-index:10}
.screen-counter span{color:var(--gold);font-weight:700}
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-left">
    <div class="header-logo">🎓</div>
    <div>
      <h1>MANAS360 <span>Certification Program Journey</span></h1>
    </div>
  </div>
  <div class="header-meta">
    <span>Stories 4.1 · 4.2 · 4.3</span>
    <span class="badge">SPRINT 4</span>
    <span id="phaseLabel">Phase 1 → Discovery</span>
  </div>
</div>

<!-- PHASE NAVIGATION -->
<div class="phase-nav" id="phaseNav">
  <button class="phase-btn active" onclick="showPhase('discovery')">
    <span class="phase-num">1</span> Discovery &amp; Enrollment
  </button>
  <button class="phase-btn" onclick="showPhase('learning')">
    <span class="phase-num">2</span> Learning &amp; Training
  </button>
  <button class="phase-btn" onclick="showPhase('assessment')">
    <span class="phase-num">3</span> Assessment &amp; Exam
  </button>
  <button class="phase-btn" onclick="showPhase('certification')">
    <span class="phase-num">4</span> Certificate &amp; Verification
  </button>
  <button class="phase-btn" onclick="showPhase('postCert')">
    <span class="phase-num">5</span> Post-Certification (Coach Active)
  </button>
</div>

<!-- FLOW AREA -->
<div class="flow-area" id="flowArea"></div>

<!-- SCREEN COUNTER -->
<div class="screen-counter">Screen <span id="screenCount">1</span> of <span id="totalScreens">15</span></div>

<script>
const phases = {

// =============================================
// PHASE 1: DISCOVERY & ENROLLMENT
// =============================================
discovery: {
  label: "Phase 1 → Discovery & Enrollment",
  screens: [
    { id:"CT01", story:"4.1", title:"🎓 Certification Programs", body:
      '<label class="mock-label">Become a Certified Coach</label>'+
      '<div class="mock-card" style="border-left:3px solid var(--gold);background:linear-gradient(135deg,#141723,#1a1810)">'+
        '<div class="card-title">🧠 NLP Mental Health Coach</div>'+
        '<div class="card-sub">6 Modules · 40+ Lessons · Practical Assignments</div>'+
        '<div class="card-sub" style="margin-top:4px;color:var(--gold)">₹4,999 · 8-12 weeks · Self-paced</div>'+
        '<div style="display:flex;gap:4px;margin-top:6px">'+
          '<span class="card-badge badge-gold">Most Popular</span>'+
          '<span class="card-badge badge-green">MANAS360 Certified</span>'+
        '</div>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--purple)">'+
        '<div class="card-title">🫂 5-Why Empathy Framework</div>'+
        '<div class="card-sub">4 Modules · 20 Lessons · Peer Practice</div>'+
        '<div class="card-sub" style="margin-top:4px;color:var(--purple)">₹2,999 · 4-6 weeks</div>'+
        '<span class="card-badge badge-purple">Advanced</span>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--teal)">'+
        '<div class="card-title">🌿 NAC Practitioner Level 1</div>'+
        '<div class="card-sub">5 Modules · 30 Lessons · Case Studies</div>'+
        '<div class="card-sub" style="margin-top:4px;color:var(--teal)">₹3,999 · 6-8 weeks</div>'+
        '<span class="card-badge badge-teal">New</span>'+
      '</div>',
      footer:'<div class="btn btn-gold btn-block">Enroll Now → NLP Coach</div>'+
              '<div class="btn btn-secondary btn-block">Compare Programs</div>'
    },
    { id:"CT02", story:"4.1", title:"📋 Program Registration", body:
      '<label class="mock-label">NLP Mental Health Coach — Enrollment</label>'+
      '<div class="mock-input">Full Name</div>'+
      '<div class="mock-input">Email</div>'+
      '<div class="mock-input">Mobile (+91)</div>'+
      '<div class="mock-row">'+
        '<div class="mock-input">City</div>'+
        '<div class="mock-input">Education ▾</div>'+
      '</div>'+
      '<div class="mock-input">Why do you want to become a coach? (optional)</div>'+
      '<div class="mock-card" style="margin-top:4px">'+
        '<div class="card-title">Program Fee: ₹4,999</div>'+
        '<div class="card-sub">✅ Lifetime access to modules</div>'+
        '<div class="card-sub">✅ Certificate with blockchain verification</div>'+
        '<div class="card-sub">✅ Listed on MANAS360 Coach Directory</div>'+
        '<div class="card-sub">✅ Patient matching after certification</div>'+
      '</div>',
      footer:'<div class="btn btn-gold btn-block">Pay ₹4,999 & Enroll →</div>'
    },
    { id:"CT03", story:"4.1", title:"✅ Enrollment Confirmed", body:
      '<div style="text-align:center;padding:14px 0">'+
        '<div style="font-size:36px">🎉</div>'+
        '<div style="font-size:16px;font-weight:700;color:var(--gold);margin:8px 0">Welcome, Coach-in-Training!</div>'+
        '<div style="font-size:11px;color:var(--muted)">NLP Mental Health Coach Program</div>'+
      '</div>'+
      '<div class="mock-card" style="border:1px solid var(--gold)">'+
        '<div class="card-sub" style="text-align:center">'+
          'Enrollment ID: <b style="color:var(--gold)">ENR-2026-04821</b><br>'+
          'Start Date: Immediate Access<br>'+
          'Estimated Completion: 8-12 weeks'+
        '</div>'+
      '</div>'+
      '<div class="mock-card">'+
        '<div class="card-sub">📱 SMS confirmation sent to +91 98765 43210</div>'+
        '<div class="card-sub">📧 Welcome email with program guide sent</div>'+
        '<div class="card-sub">💬 Added to WhatsApp cohort group</div>'+
      '</div>',
      footer:'<div class="btn btn-gold btn-block">Start Module 1 →</div>'+
              '<div class="btn btn-secondary btn-block">View Program Overview</div>'
    }
  ]
},

// =============================================
// PHASE 2: LEARNING & TRAINING
// =============================================
learning: {
  label: "Phase 2 → Learning & Training",
  screens: [
    { id:"CT04", story:"4.1", title:"📚 Module Dashboard", body:
      '<label class="mock-label">Your Training Modules</label>'+
      '<div class="mock-card" style="border-left:3px solid var(--accent)">'+
        '<div class="card-title">Module 1: Foundations of NLP</div>'+
        '<div class="card-sub">8 lessons · 2 hrs · ✅ Complete</div>'+
        '<div class="progress-bar"><div class="fill" style="width:100%;background:var(--accent)"></div></div>'+
        '<span class="card-badge badge-green">Score: 92%</span>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--accent)">'+
        '<div class="card-title">Module 2: Rapport Building</div>'+
        '<div class="card-sub">6 lessons · 1.5 hrs · ✅ Complete</div>'+
        '<div class="progress-bar"><div class="fill" style="width:100%;background:var(--accent)"></div></div>'+
        '<span class="card-badge badge-green">Score: 88%</span>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--gold)">'+
        '<div class="card-title">Module 3: 5-Why Empathy Framework</div>'+
        '<div class="card-sub">5 lessons · 1 hr · 🔄 In Progress</div>'+
        '<div class="progress-bar"><div class="fill" style="width:60%;background:var(--gold)"></div></div>'+
        '<span class="card-badge badge-orange">3 of 5 done</span>'+
      '</div>'+
      '<div class="mock-card" style="opacity:.6">'+
        '<div class="card-title">Module 4: Cognitive Restructuring</div>'+
        '<div class="card-sub">7 lessons · 2 hrs · 🔒 Locked</div>'+
      '</div>'+
      '<div class="mock-card" style="opacity:.5">'+
        '<div class="card-title">Module 5: Behavioral Activation</div>'+
        '<div class="card-sub">6 lessons · 1.5 hrs · 🔒 Locked</div>'+
      '</div>'+
      '<div class="mock-card" style="opacity:.4">'+
        '<div class="card-title">Module 6: NAC Practicum</div>'+
        '<div class="card-sub">8 lessons · 3 hrs · 🔒 Locked</div>'+
      '</div>',
      footer:'<div class="btn btn-gold btn-block">Continue Module 3 →</div>'
    },
    { id:"CT05", story:"4.1", title:"🎬 Video Lesson", body:
      '<label class="mock-label">Module 3 · Lesson 4 of 5</label>'+
      '<div style="background:#000;border-radius:10px;height:130px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;position:relative">'+
        '<div style="font-size:11px;color:#444">🎬 Video: "Asking the Right Why"</div>'+
        '<div style="position:absolute;bottom:6px;left:8px;right:8px;height:4px;background:#222;border-radius:2px"><div style="width:65%;height:100%;background:var(--gold);border-radius:2px"></div></div>'+
        '<div style="position:absolute;bottom:12px;right:10px;font-size:9px;color:#666">12:45 / 19:30</div>'+
      '</div>'+
      '<div class="mock-card">'+
        '<div class="card-title">📝 Lesson Notes</div>'+
        '<div class="card-sub">• The 5-Why technique uncovers root emotional triggers<br>• Never ask "why" judgmentally — use curious tone<br>• Pause 3-5 sec after each answer before next "why"</div>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--blue)">'+
        '<div class="card-title">📎 Downloadable Resources</div>'+
        '<div class="card-sub">• 5-Why Worksheet Template (PDF)<br>• Practice Scenarios Deck<br>• Role-Play Script Guide</div>'+
      '</div>',
      footer:'<div class="btn btn-gold btn-block">Complete & Next Lesson →</div>'+
              '<div class="btn btn-secondary btn-block">Mark for Review</div>'
    },
    { id:"CT06", story:"4.1", title:"✍️ Practice Assignment", body:
      '<label class="mock-label">Module 3 · Practical Assignment</label>'+
      '<div class="mock-card" style="border-left:3px solid var(--purple)">'+
        '<div class="card-title">Assignment: 5-Why Role Play</div>'+
        '<div class="card-sub">Conduct a 15-min practice session with a peer using the 5-Why Empathy Framework. Record key observations.</div>'+
      '</div>'+
      '<label class="mock-label" style="margin-top:8px">Peer Partner</label>'+
      '<div class="mock-card">'+
        '<div class="card-title">Priya M. (Cohort #12)</div>'+
        '<div class="card-sub">📅 Scheduled: Tomorrow 3:00 PM · Via Video</div>'+
        '<span class="card-badge badge-blue">Matched</span>'+
      '</div>'+
      '<label class="mock-label" style="margin-top:8px">Submission</label>'+
      '<div class="mock-card">'+
        '<div class="card-sub">📹 Upload Video Recording (max 15 min)</div>'+
        '<div class="btn btn-secondary btn-small" style="margin-top:4px">Upload Recording</div>'+
      '</div>'+
      '<div class="mock-input" style="height:60px;margin-top:6px">Reflection notes: What went well? What would you do differently?</div>',
      footer:'<div class="btn btn-gold btn-block">Submit Assignment →</div>'
    }
  ]
},

// =============================================
// PHASE 3: ASSESSMENT & EXAM
// =============================================
assessment: {
  label: "Phase 3 → Assessment & Exam",
  screens: [
    { id:"CT07", story:"4.1", title:"📝 Module Quiz", body:
      '<label class="mock-label">Module 3 · End-of-Module Quiz</label>'+
      '<div class="mock-card" style="border-left:3px solid var(--gold)">'+
        '<div class="card-title">Q5: A client says "I don\'t know why I feel this way." Your best first response using the 5-Why framework?</div>'+
      '</div>'+
      '<div class="mock-card" style="cursor:pointer"><div class="card-sub">A) "Let\'s explore that — what were you doing when this feeling started?"</div></div>'+
      '<div class="mock-card" style="cursor:pointer;border-left:3px solid var(--accent)"><div class="card-sub">B) "That\'s okay. Can you describe the feeling a bit more?"</div></div>'+
      '<div class="mock-card" style="cursor:pointer"><div class="card-sub">C) "You need to try harder to identify the cause."</div></div>'+
      '<div class="mock-card" style="cursor:pointer"><div class="card-sub">D) "Let me tell you why you might be feeling this way."</div></div>'+
      '<div style="text-align:center;font-size:10px;color:var(--muted);margin-top:8px">'+
        '5 / 10 · Passing: 70% · ⏳ 8:32 remaining'+
      '</div>'+
      '<div class="progress-bar"><div class="fill" style="width:50%;background:var(--gold)"></div></div>',
      footer:'<div class="btn btn-gold btn-block">Next Question →</div>'
    },
    { id:"CT08", story:"4.1, 4.2", title:"🏆 Final Certification Exam", body:
      '<div class="mock-card" style="border:1px solid var(--gold);background:linear-gradient(135deg,#141723,#1a1810)">'+
        '<div style="text-align:center;padding:8px 0">'+
          '<div style="font-size:28px">📋</div>'+
          '<div style="font-size:14px;font-weight:700;color:var(--gold);margin:6px 0">Final Certification Exam</div>'+
          '<div style="font-size:10px;color:var(--muted)">NLP Mental Health Coach</div>'+
        '</div>'+
      '</div>'+
      '<div class="mock-card">'+
        '<div class="card-title">Exam Details</div>'+
        '<div class="card-sub">📝 30 questions (MCQ + scenario-based)</div>'+
        '<div class="card-sub">⏳ 45 minutes time limit</div>'+
        '<div class="card-sub">✅ Passing score: 70% (21/30)</div>'+
        '<div class="card-sub">🔄 2 retake attempts allowed</div>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--accent)">'+
        '<div class="card-title">Your Readiness</div>'+
        '<div class="card-sub">Module Avg: <b style="color:var(--accent)">88%</b></div>'+
        '<div class="card-sub">Assignments: <b style="color:var(--accent)">6/6 Complete</b></div>'+
        '<div class="card-sub">Practice Hours: <b style="color:var(--accent)">12.5 hrs</b></div>'+
        '<span class="card-badge badge-green">Ready to Attempt</span>'+
      '</div>'+
      '<div class="mock-card">'+
        '<div class="card-sub" style="text-align:center">⚠️ Proctored exam · Camera must be ON<br>No tab switching allowed</div>'+
      '</div>',
      footer:'<div class="btn btn-gold btn-block">Start Exam →</div>'
    },
    { id:"CT09", story:"4.1, 4.2", title:"🎬 Exam In Progress", body:
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'+
        '<span style="font-size:10px;color:var(--red);font-weight:600">● PROCTORED</span>'+
        '<span style="font-size:12px;color:var(--gold);font-weight:700;font-family:JetBrains Mono,monospace">⏳ 28:15</span>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--gold)">'+
        '<div class="card-title">Q18: A corporate employee says they feel overwhelmed and can\'t concentrate. Using NAC principles, which anchoring approach would you use first?</div>'+
      '</div>'+
      '<div class="mock-card" style="cursor:pointer"><div class="card-sub">A) Swish Pattern for focus redirection</div></div>'+
      '<div class="mock-card" style="cursor:pointer"><div class="card-sub">B) Circle of Excellence for confidence</div></div>'+
      '<div class="mock-card" style="cursor:pointer;border-left:3px solid var(--accent)"><div class="card-sub">C) Calm state anchor + identify peak demand triggers</div></div>'+
      '<div class="mock-card" style="cursor:pointer"><div class="card-sub">D) Timeline therapy for past stressor release</div></div>'+
      '<div style="margin-top:8px">'+
        '<div class="progress-bar"><div class="fill" style="width:60%;background:var(--gold)"></div></div>'+
        '<div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-top:4px">'+
          '<span>18 of 30</span>'+
          '<span>12 remaining</span>'+
        '</div>'+
      '</div>',
      footer:'<div class="btn btn-gold btn-block">Next Question →</div>'+
              '<div class="btn btn-secondary btn-block">Flag for Review</div>'
    }
  ]
},

// =============================================
// PHASE 4: CERTIFICATE & VERIFICATION
// =============================================
certification: {
  label: "Phase 4 → Certificate & Verification",
  screens: [
    { id:"CT10", story:"4.2", title:"🎉 Exam Results", body:
      '<div style="text-align:center;padding:12px 0">'+
        '<div style="font-size:40px">🏆</div>'+
        '<div style="font-size:18px;font-weight:700;color:var(--gold);margin:8px 0">Congratulations!</div>'+
        '<div style="font-size:11px;color:var(--muted)">You passed the NLP Mental Health Coach Certification</div>'+
      '</div>'+
      '<div class="stat-row">'+
        '<div class="stat-box"><div class="stat-num">87%</div><div class="stat-label">Final Score</div></div>'+
        '<div class="stat-box"><div class="stat-num">26/30</div><div class="stat-label">Correct</div></div>'+
        '<div class="stat-box"><div class="stat-num">32m</div><div class="stat-label">Time Taken</div></div>'+
      '</div>'+
      '<div class="mock-card">'+
        '<div class="card-title">📊 Score Breakdown</div>'+
        '<div class="card-sub">NLP Foundations: 9/10 · Rapport: 5/5</div>'+
        '<div class="card-sub">5-Why Framework: 4/5 · CBT: 4/5</div>'+
        '<div class="card-sub">NAC Practicum: 4/5</div>'+
        '<span class="card-badge badge-green">Above Average (Cohort Avg: 79%)</span>'+
      '</div>',
      footer:'<div class="btn btn-gold btn-block">Generate Certificate →</div>'
    },
    { id:"CT11", story:"4.2", title:"📜 Certificate Issued", body:
      '<div style="background:linear-gradient(135deg,#1a1810,#141723);border:2px solid var(--gold);border-radius:12px;padding:16px;text-align:center;margin-bottom:8px">'+
        '<div style="font-size:9px;color:var(--gold);letter-spacing:4px;font-weight:700">MANAS360</div>'+
        '<div style="font-size:14px;font-weight:700;color:var(--white);margin:8px 0">Certified NLP Mental Health Coach</div>'+
        '<div style="font-size:11px;color:var(--text)">Awarded to: <b>Priya Mehta</b></div>'+
        '<div style="font-size:10px;color:var(--muted);margin-top:4px">February 14, 2026</div>'+
        '<div style="margin:10px 0;font-size:9px;color:var(--muted)">Certificate ID: <b style="color:var(--gold)">MANS360-NLP-2026-0847</b></div>'+
        '<div style="width:50px;height:50px;border:2px solid var(--gold);border-radius:6px;background:#0a0c14;display:flex;align-items:center;justify-content:center;margin:0 auto;font-size:9px;color:var(--muted)">▣ QR</div>'+
      '</div>'+
      '<div class="mock-card">'+
        '<div class="card-sub">🔗 Blockchain Verified · Immutable Record</div>'+
        '<div class="card-sub">🗓 Valid: 2 Years (Feb 2026 — Feb 2028)</div>'+
        '<div class="card-sub">🔄 Renewal: Complete 10 CE credits before expiry</div>'+
      '</div>',
      footer:'<div class="btn btn-gold btn-block">Download PDF Certificate</div>'+
              '<div class="btn btn-blue btn-block">Share on LinkedIn</div>'+
              '<div class="btn btn-secondary btn-block">Share via WhatsApp</div>'
    },
    { id:"CT12", story:"4.2", title:"🔍 Public Verification Portal", body:
      '<label class="mock-label">Certificate Verification (Public Page)</label>'+
      '<div style="text-align:center;padding:8px 0;font-size:11px;color:var(--muted)">Anyone can verify a MANAS360 certificate</div>'+
      '<div class="mock-input">Enter Certificate ID or scan QR code</div>'+
      '<div class="divider"></div>'+
      '<div class="mock-card" style="border:1px solid var(--accent)">'+
        '<div style="text-align:center;padding:4px 0">'+
          '<div style="font-size:20px">✅</div>'+
          '<div style="font-size:13px;font-weight:700;color:var(--accent);margin:4px 0">VERIFIED — AUTHENTIC</div>'+
        '</div>'+
        '<div class="divider"></div>'+
        '<div class="card-sub">Name: <b style="color:var(--white)">Priya Mehta</b></div>'+
        '<div class="card-sub">Program: NLP Mental Health Coach</div>'+
        '<div class="card-sub">Score: 87% · Issued: Feb 14, 2026</div>'+
        '<div class="card-sub">Status: <b style="color:var(--accent)">Active</b></div>'+
        '<div class="card-sub">Blockchain Tx: <span style="font-family:JetBrains Mono,monospace;font-size:9px;color:var(--gold)">0x7f3e...a1b2</span></div>'+
      '</div>',
      footer:'<div class="btn btn-primary btn-block">Print Verification</div>'
    }
  ]
},

// =============================================
// PHASE 5: POST-CERTIFICATION (COACH ACTIVE)
// =============================================
postCert: {
  label: "Phase 5 → Post-Certification (Coach Active)",
  screens: [
    { id:"CT13", story:"4.3", title:"🏠 Coach Dashboard", body:
      '<label class="mock-label">Welcome, Coach Priya</label>'+
      '<div class="stat-row">'+
        '<div class="stat-box"><div class="stat-num" style="color:var(--accent)">8</div><div class="stat-label">Active Patients</div></div>'+
        '<div class="stat-box"><div class="stat-num">4.7</div><div class="stat-label">Rating</div></div>'+
        '<div class="stat-box"><div class="stat-num">₹12K</div><div class="stat-label">This Month</div></div>'+
      '</div>'+
      '<label class="mock-label" style="margin-top:4px">Today\'s Sessions</label>'+
      '<div class="mock-card" style="border-left:3px solid var(--accent)">'+
        '<div class="card-title">Rahul S. · 3:00 PM</div>'+
        '<div class="card-sub">Stress Management · Session #3</div>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--blue)">'+
        '<div class="card-title">Deepa K. · 5:00 PM</div>'+
        '<div class="card-sub">Career Anxiety · New Patient</div>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--gold)">'+
        '<div class="card-title">📊 Revenue Split</div>'+
        '<div class="card-sub">You earn <b style="color:var(--accent)">60%</b> · Platform: 40%</div>'+
        '<div class="card-sub">Payouts via PhonePe · Every 15th</div>'+
      '</div>',
      footer:'<div class="btn btn-primary btn-block">Start Session →</div>'+
              '<div class="btn btn-secondary btn-block">View All Patients</div>'
    },
    { id:"CT14", story:"4.3", title:"🤝 Patient Matching", body:
      '<label class="mock-label">New Match Requests</label>'+
      '<div class="mock-card" style="border-left:3px solid var(--accent)">'+
        '<div class="card-title">Arun M. · 24 · Bangalore</div>'+
        '<div class="card-sub">Needs: Work-Life Balance · Stress</div>'+
        '<div class="card-sub">Language: Hindi, English</div>'+
        '<div class="card-sub">Budget: ₹500-800/session</div>'+
        '<div style="display:flex;gap:4px;margin-top:6px">'+
          '<div class="btn btn-primary btn-small">✅ Accept</div>'+
          '<div class="btn btn-secondary btn-small">💬 Message</div>'+
          '<div class="btn btn-secondary btn-small">⏩ Pass</div>'+
        '</div>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--blue)">'+
        '<div class="card-title">Sneha R. · 31 · Dharwad</div>'+
        '<div class="card-sub">Needs: Relationship Stress · Self-esteem</div>'+
        '<div class="card-sub">Language: Kannada, English</div>'+
        '<div class="card-sub">Budget: ₹400-600/session</div>'+
        '<div style="display:flex;gap:4px;margin-top:6px">'+
          '<div class="btn btn-primary btn-small">✅ Accept</div>'+
          '<div class="btn btn-secondary btn-small">💬 Message</div>'+
          '<div class="btn btn-secondary btn-small">⏩ Pass</div>'+
        '</div>'+
      '</div>',
      footer:'<div class="btn btn-gold btn-block">View Match Queue (5 pending)</div>'
    },
    { id:"CT15", story:"4.1, 4.2", title:"📈 CE Credits & Renewal", body:
      '<label class="mock-label">Continuing Education</label>'+
      '<div class="mock-card" style="border:1px solid var(--gold)">'+
        '<div class="card-title">Certificate Status: Active</div>'+
        '<div class="card-sub">Expires: February 14, 2028</div>'+
        '<div class="card-sub">CE Credits: <b style="color:var(--gold)">4 / 10 earned</b></div>'+
        '<div class="progress-bar"><div class="fill" style="width:40%;background:var(--gold)"></div></div>'+
      '</div>'+
      '<label class="mock-label" style="margin-top:8px">Available CE Courses</label>'+
      '<div class="mock-card" style="border-left:3px solid var(--purple)">'+
        '<div class="card-title">Advanced Reframing Techniques</div>'+
        '<div class="card-sub">2 CE Credits · 3 hrs · Free for certified coaches</div>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--teal)">'+
        '<div class="card-title">Trauma-Informed Coaching</div>'+
        '<div class="card-sub">3 CE Credits · 5 hrs · ₹999</div>'+
      '</div>'+
      '<div class="mock-card" style="border-left:3px solid var(--blue)">'+
        '<div class="card-title">Corporate Wellness Specialization</div>'+
        '<div class="card-sub">3 CE Credits · 4 hrs · ₹1,499</div>'+
      '</div>',
      footer:'<div class="btn btn-gold btn-block">Enroll in CE Course →</div>'
    }
  ]
}

};

// =============================================
// RENDER ENGINE
// =============================================
var totalScreenCount = 0;
var phaseKeys = Object.keys(phases);
for (var i = 0; i < phaseKeys.length; i++) {
  totalScreenCount += phases[phaseKeys[i]].screens.length;
}

function showPhase(phaseId) {
  var phase = phases[phaseId];
  var area = document.getElementById('flowArea');
  document.getElementById('phaseLabel').textContent = phase.label;
  document.getElementById('totalScreens').textContent = totalScreenCount;

  // Count screens up to this phase
  var count = 0;
  for (var k = 0; k < phaseKeys.length; k++) {
    if (phaseKeys[k] === phaseId) { count += 1; break; }
    count += phases[phaseKeys[k]].screens.length;
  }
  document.getElementById('screenCount').textContent = count + '–' + (count + phase.screens.length - 1);

  // Update phase nav active state
  var btns = document.querySelectorAll('.phase-nav .phase-btn');
  // Since we are using an iframe, we need to handle button states within the script
  var allBtns = document.querySelectorAll('.phase-btn');
  allBtns.forEach(btn => btn.classList.remove('active'));
  
  // Find which button was clicked (best effort since it's inside or outside)
  // This is a simplified version for the iframe itself
  var html = '';
  for (var s = 0; s < phase.screens.length; s++) {
    var scr = phase.screens[s];
    if (s > 0) html += '<div class="flow-arrow">→</div>';
    html += '<div class="phone">' +
      '<div class="phone-status"><span>9:41</span><span>MANAS360</span><span>📶 ■</span></div>' +
      '<div class="phone-header"><span class="screen-id">' + scr.id + '</span><span class="story-ref">Story ' + scr.story + '</span></div>' +
      '<div class="phone-title">' + scr.title + '</div>' +
      '<div class="phone-body">' + scr.body + '</div>' +
      (scr.footer ? '<div class="phone-footer">' + scr.footer + '</div>' : '') +
      '</div>';
  }
  area.innerHTML = html;
  area.scrollLeft = 0;
}

// Global exposure for iframe access
window.showPhase = showPhase;

// Init
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('totalScreens').textContent = totalScreenCount;
  showPhase('discovery');
});
</script>
</body>
</html>
`;
