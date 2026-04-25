import { useEffect, useMemo, useState } from 'react';
import './SpecializedCarePage.css';

type FilterSegment = 'all' | 'adults' | 'teens' | 'children' | 'programs';
type PathType = 'single' | 'program';

type ProgramKey = 'anxiety' | 'depression' | 'ocd' | 'child' | 'adhd' | 'addiction';

type ProgramWeek = { n: string; d: string };
type ProgramInclude = { icon: string; title: string; desc: string };
type ProgramTag = { cls: string; txt: string };

type ProgramData = {
  emoji: string;
  title: string;
  who: string;
  segments: string;
  feeling: string;
  helps: string;
  singlePrice: string;
  singleDesc: string;
  programPrice: string;
  programDuration: string;
  programSave: string;
  programDesc: string;
  weeks: ProgramWeek[];
  includes: ProgramInclude[];
  tags: ProgramTag[];
};

const PROGRAMS: Record<ProgramKey, ProgramData> = {
  anxiety: {
    emoji: '😰',
    title: 'Worry & Anxiety',
    who: 'For adults & teens',
    segments: 'adults teens',
    feeling: `"My mind won't stop. I overthink everything. Sometimes my heart races for no reason. I cancel plans because I'm scared of what might happen. I know it's not rational but I can't control it."`,
    helps: 'Generalized anxiety, panic attacks, social anxiety, health anxiety, constant worrying, avoidance, physical symptoms (racing heart, sweating, stomach issues)',
    singlePrice: '₹699',
    singleDesc: 'One session at a time',
    programPrice: '₹4,999',
    programDuration: '8 weeks',
    programSave: 'Save ₹596 vs individual sessions',
    programDesc: '8 sessions + daily AI support',
    weeks: [
      { n: 'Week 1-2', d: "Understanding your anxiety — what triggers it, how it shows up in your body, and why your brain is doing this. You'll learn it's not your fault." },
      { n: 'Week 3-4', d: 'Breathing & grounding techniques that actually work. Your therapist will practice these WITH you, not just tell you about them.' },
      { n: 'Week 5-6', d: "CBT thought challenging — catching the 'what if' thoughts and learning to question them. Between sessions, AnytimeBuddy helps you practice." },
      { n: 'Week 7-8', d: 'Building your anxiety toolkit — what to do when panic hits, how to face avoided situations gradually, and creating a plan for staying well.' },
    ],
    includes: [
      { icon: '👩‍⚕️', title: '8 sessions (50 min each)', desc: 'Weekly 1:1 with anxiety specialist' },
      { icon: '🤖', title: 'Daily AnytimeBuddy check-ins', desc: 'AI support between sessions' },
      { icon: '🎵', title: 'Sound Therapy access', desc: 'Calming tracks for panic moments' },
      { icon: '📊', title: 'GAD-7 tracking', desc: 'See your anxiety score drop weekly' },
      { icon: '📝', title: 'CBT worksheets', desc: 'Thought records & exposure plans' },
      { icon: '📱', title: 'WhatsApp updates', desc: 'Session reminders + progress tips' },
    ],
    tags: [{ cls: 't-a', txt: 'Adults' }, { cls: 't-t', txt: 'Teens 13+' }],
  },
  depression: {
    emoji: '🌧️',
    title: 'Sadness & Depression',
    who: 'For adults & teens',
    segments: 'adults teens',
    feeling: `"Nothing feels fun anymore. I sleep too much or can't sleep at all. I don't want to get out of bed. I feel like a burden to everyone around me. Some days I wonder what the point of anything is."`,
    helps: 'Persistent sadness, loss of interest, fatigue, hopelessness, low self-worth, sleep problems, difficulty concentrating, withdrawal from people',
    singlePrice: '₹699',
    singleDesc: 'One session at a time',
    programPrice: '₹5,499',
    programDuration: '8 weeks',
    programSave: 'Save ₹1,093 vs individual sessions',
    programDesc: 'Weekly 1:1 + group + AI buddy',
    weeks: [
      { n: 'Week 1-2', d: "Your therapist gets to know YOU — not just your symptoms. What happened, what's happening now, and what you wish was different. No pressure to 'be positive.'" },
      { n: 'Week 3-4', d: "Behavioral activation — small steps to bring moments of pleasure back. Not 'just exercise more' — real, personalized micro-actions that fit YOUR life." },
      { n: 'Week 5-6', d: "Thought patterns — why your brain tells you you're worthless and how to talk back to it. Plus: one group session with others who understand." },
      { n: 'Week 7-8', d: "Relapse prevention — recognizing early warning signs, building your support system, and creating a wellness plan. You leave with a toolkit, not just 'try harder.'" },
    ],
    includes: [
      { icon: '👩‍⚕️', title: '7 individual sessions', desc: 'Weekly 1:1 with depression specialist' },
      { icon: '👥', title: '1 group session', desc: 'Connect with others who understand' },
      { icon: '🤖', title: 'Daily mood check-ins', desc: 'AnytimeBuddy tracks how you\'re doing' },
      { icon: '📊', title: 'PHQ-9 tracking', desc: 'Watch your depression score improve' },
      { icon: '🎵', title: 'Sound Therapy for sleep', desc: '432Hz tracks for better rest' },
      { icon: '📱', title: 'WhatsApp support', desc: 'Weekly tips + session reminders' },
    ],
    tags: [{ cls: 't-a', txt: 'Adults' }, { cls: 't-t', txt: 'Teens 13+' }],
  },
  ocd: {
    emoji: '🔁',
    title: 'OCD & Unwanted Thoughts',
    who: 'For adults & teens',
    segments: 'adults teens',
    feeling: `"I keep checking things over and over. Scary thoughts pop into my head and won't leave. I wash my hands until they're raw. I do things in a certain order or something bad will happen. I KNOW it's not rational but I can't stop."`,
    helps: 'Obsessive thoughts, compulsive rituals, checking, contamination fears, unwanted intrusive thoughts, need for symmetry, \'just right\' feelings, mental rituals',
    singlePrice: '₹999',
    singleDesc: 'ERP-trained specialist',
    programPrice: '₹7,999',
    programDuration: '12 weeks',
    programSave: 'Save ₹3,989 vs individual sessions',
    programDesc: 'Gold standard ERP treatment',
    weeks: [
      { n: 'Week 1-3', d: 'Understanding YOUR OCD — mapping your obsessions, compulsions, and avoidance patterns. Building a fear hierarchy (what scares you most vs least). Psychoeducation: OCD is a brain glitch, not a character flaw.' },
      { n: 'Week 4-6', d: 'Beginning ERP (Exposure and Response Prevention) — starting with easier exposures. You face the fear WITHOUT doing the compulsion. Your therapist is right there with you. This is hard but it works.' },
      { n: 'Week 7-9', d: 'Advancing up your hierarchy — tackling harder exposures. Between sessions, you practice daily with AnytimeBuddy guiding your ERP homework. Your compulsions start losing their grip.' },
      { n: 'Week 10-12', d: 'Relapse prevention and independence — handling OCD spikes on your own, recognizing new themes, and building a long-term management plan. OCD may whisper, but you\'ll know how to respond.' },
    ],
    includes: [
      { icon: '👩‍⚕️', title: '12 ERP sessions', desc: 'Weekly with OCD specialist (ERP-trained)' },
      { icon: '🤖', title: 'Daily ERP practice', desc: 'AnytimeBuddy guides exposure homework' },
      { icon: '📝', title: 'Fear hierarchy tracker', desc: 'Visual progress on confronted fears' },
      { icon: '📊', title: 'Y-BOCS tracking', desc: 'Gold-standard OCD severity measure' },
      { icon: '🎵', title: 'Anxiety management', desc: 'Sound Therapy for post-exposure calm' },
      { icon: '📱', title: 'WhatsApp support', desc: 'Daily check-in + session reminders' },
    ],
    tags: [{ cls: 't-a', txt: 'Adults' }, { cls: 't-t', txt: 'Teens 13+' }],
  },
  child: {
    emoji: '🧒',
    title: 'My Child Needs Help',
    who: 'For parents of children 6–17',
    segments: 'children teens',
    feeling: `"My child throws tantrums that feel too intense. They refuse to go to school. They've become very quiet and withdrawn. I've tried everything — rewards, punishments, being patient — nothing works. I don't know how to help them and I'm scared."`,
    helps: 'Behavioral issues, school refusal, emotional outbursts, bullying effects, social withdrawal, parent-child conflict, screen addiction, bedwetting, separation anxiety',
    singlePrice: '₹899',
    singleDesc: 'Parent joins first 2 sessions',
    programPrice: '₹4,499',
    programDuration: '6 weeks',
    programSave: 'Save ₹895 vs individual sessions',
    programDesc: 'Child + parent sessions combined',
    weeks: [
      { n: 'Week 1', d: 'Parent-only session — your therapist wants to understand YOUR perspective first. What\'s happening, what you\'ve tried, family dynamics. No judgment. Your child doesn\'t attend this one.' },
      { n: 'Week 2', d: 'Joint session — your child meets the therapist with you present. Play-based or talk-based depending on age. Building trust and safety. Therapist observes the parent-child dynamic.' },
      { n: 'Week 3-4', d: 'Child-only sessions (parent in waiting room) — therapist works directly with your child using age-appropriate techniques. You receive a summary after each session.' },
      { n: 'Week 5-6', d: 'Family integration — bringing together what the therapist learned. Parent coaching: specific strategies for YOUR child, not generic parenting advice. School coordination letter if needed.' },
    ],
    includes: [
      { icon: '👩‍⚕️', title: '6 sessions total', desc: 'Mix of parent, child, and joint sessions' },
      { icon: '👨‍👧', title: 'Parent coaching', desc: 'Specific strategies for YOUR child' },
      { icon: '📄', title: 'School coordination', desc: 'Letter to school if needed (e.g., school refusal)' },
      { icon: '🎮', title: 'Play-based therapy', desc: 'Age-appropriate techniques (art, play, CBT)' },
      { icon: '📊', title: 'Behavioral tracking', desc: 'Track changes week by week' },
      { icon: '📱', title: 'Parent WhatsApp updates', desc: 'Weekly progress + home strategies' },
    ],
    tags: [{ cls: 't-c', txt: 'Children 6–12' }, { cls: 't-t', txt: 'Teens 13–17' }],
  },
  adhd: {
    emoji: '⚡',
    title: 'ADHD & Focus Issues',
    who: 'For adults, teens & children',
    segments: 'adults children teens',
    feeling: `"I can't sit still. I start ten things but finish none. People think I'm lazy but my brain just works differently. I forget everything — appointments, deadlines, where I put my keys. I zone out in conversations and then feel terrible about it."`,
    helps: 'Attention difficulties, hyperactivity, impulsivity, time blindness, emotional dysregulation, academic/work struggles, relationship strain from ADHD patterns',
    singlePrice: '₹1,499',
    singleDesc: 'Psychiatrist assessment',
    programPrice: '₹5,999',
    programDuration: '8 weeks',
    programSave: 'Save ₹5,993 vs individual sessions',
    programDesc: 'Strategies + optional medication',
    weeks: [
      { n: 'Week 1-2', d: 'Comprehensive ADHD assessment — psychiatrist evaluation (is it ADHD or something else?). If confirmed: understand YOUR specific ADHD profile. Optional: discuss medication if appropriate.' },
      { n: 'Week 3-4', d: 'External scaffolding — building systems that work WITH your brain, not against it. Timers, body doubling, chunking, visual schedules. Your therapist helps you find what clicks for YOU.' },
      { n: 'Week 5-6', d: 'Emotional regulation — the part of ADHD nobody talks about. Why you feel everything so intensely, why rejection stings so much, and how to manage emotional floods.' },
      { n: 'Week 7-8', d: 'Sustainability — what happens when the novelty of new systems wears off (because it will). Building accountability, self-compassion, and a long-term ADHD management identity.' },
    ],
    includes: [
      { icon: '💊', title: 'Psychiatrist assessment', desc: 'Formal evaluation + optional medication' },
      { icon: '👩‍⚕️', title: '7 therapy sessions', desc: 'ADHD-specialized psychologist' },
      { icon: '🤖', title: 'Focus reminders', desc: 'AnytimeBuddy sends task nudges' },
      { icon: '📊', title: 'ADHD symptom tracking', desc: 'Weekly rating scale to track change' },
      { icon: '📝', title: 'Strategy workbook', desc: 'Personalized ADHD toolkit PDF' },
      { icon: '📱', title: 'WhatsApp accountability', desc: 'Daily task check-ins' },
    ],
    tags: [{ cls: 't-a', txt: 'Adults' }, { cls: 't-t', txt: 'Teens' }, { cls: 't-c', txt: 'Children' }],
  },
  addiction: {
    emoji: '🔗',
    title: 'Addiction & Substance Use',
    who: 'For adults 18+',
    segments: 'adults',
    feeling: `"I know I should stop but I can't. It started as an escape but now it controls me. Alcohol, smoking, gaming, porn, substances — I've tried quitting before. I'm ashamed to even talk about it. I hide it from everyone."`,
    helps: 'Alcohol, nicotine, cannabis, gaming, pornography, phone addiction, substance misuse, binge eating, relapse prevention, shame and secrecy patterns',
    singlePrice: '₹999',
    singleDesc: 'Zero judgment, 100% private',
    programPrice: '₹8,999',
    programDuration: '12 weeks',
    programSave: 'Save ₹2,989 vs individual sessions',
    programDesc: '1:1 + group + daily check-ins',
    weeks: [
      { n: 'Week 1-2', d: 'No lecture. No shame. Your therapist wants to understand your relationship with the substance/behavior. When did it start? What need does it meet? Building a picture without judgment.' },
      { n: 'Week 3-5', d: 'Identifying triggers and building a craving toolkit. What happens in the 30 minutes before you use? Who/what/where are the patterns? Practical alternatives for each trigger.' },
      { n: 'Week 6-8', d: 'Underlying pain — addiction is usually a painkiller for something else. Trauma, loneliness, boredom, anxiety. Addressing the root cause, not just the symptom.' },
      { n: 'Week 9-10', d: 'Group sessions with others in recovery (anonymous, no cameras required). You are NOT the only one. Hearing others\' stories breaks the shame cycle.' },
      { n: 'Week 11-12', d: 'Relapse prevention plan — because slips happen and they don\'t erase your progress. Building your support network, daily check-in habits, and what to do when the urge hits at 2 AM.' },
    ],
    includes: [
      { icon: '👩‍⚕️', title: '10 individual sessions', desc: 'Weekly with addiction specialist' },
      { icon: '👥', title: '2 group sessions', desc: 'Anonymous peer support (camera optional)' },
      { icon: '🤖', title: 'Daily craving check-ins', desc: 'AnytimeBuddy: \'How strong is the urge?\'' },
      { icon: '📊', title: 'Sobriety/habit tracking', desc: 'Visual streak counter' },
      { icon: '🎵', title: 'Urge surfing audio', desc: 'Sound Therapy for craving moments' },
      { icon: '📱', title: '24/7 WhatsApp support', desc: 'Text when you\'re struggling, anytime' },
    ],
    tags: [{ cls: 't-a', txt: 'Adults 18+' }],
  },
};

type BookingState = {
  name: string;
  phone: string;
  email: string;
  lang: string;
  day: string;
  time: string;
  note: string;
};

const initialBookingState: BookingState = {
  name: '',
  phone: '',
  email: '',
  lang: 'English',
  day: '',
  time: '',
  note: '',
};

const filterLabels: Array<{ id: FilterSegment; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'adults', label: 'For Adults' },
  { id: 'teens', label: 'For Teens' },
  { id: 'children', label: 'For Children' },
  { id: 'programs', label: 'Programs Only' },
];

const programOrder: ProgramKey[] = ['anxiety', 'depression', 'ocd', 'child', 'adhd', 'addiction'];

export default function SpecializedCarePage() {
  const [activeFilter, setActiveFilter] = useState<FilterSegment>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentCondition, setCurrentCondition] = useState<ProgramKey>('anxiety');
  const [selectedPath, setSelectedPath] = useState<PathType>('program');
  const [bookingState, setBookingState] = useState<BookingState>(initialBookingState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [successHtml, setSuccessHtml] = useState('');

  const currentProgram = PROGRAMS[currentCondition];

  useEffect(() => {
    document.body.style.overflow = isModalOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  const closeModal = () => {
    setIsModalOpen(false);
    setBookingSuccess(false);
    setSuccessHtml('');
    setBookingState(initialBookingState);
    setSelectedPath('program');
  };

  const openModal = (key: ProgramKey, path: PathType = 'program') => {
    setCurrentCondition(key);
    setSelectedPath(path);
    setBookingSuccess(false);
    setSuccessHtml('');
    setBookingState(initialBookingState);
    setIsModalOpen(true);
  };

  const filteredPrograms = useMemo(() => {
    return programOrder.filter((key) => {
      if (activeFilter === 'all' || activeFilter === 'programs') return true;
      return PROGRAMS[key].segments.includes(activeFilter);
    });
  }, [activeFilter]);

  const selectPath = (path: PathType) => {
    setSelectedPath(path);
  };

  const handleSubmit = async () => {
    const p = currentProgram;
    const { name, phone, email, lang, day, time, note } = bookingState;

    if (!name.trim()) {
      window.alert('Please enter your name');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      window.alert('Please enter a valid WhatsApp number');
      return;
    }
    if (!day) {
      window.alert('Please select your preferred day');
      return;
    }
    if (!time) {
      window.alert('Please select your preferred time');
      return;
    }

    setIsSubmitting(true);

    const price = selectedPath === 'single' ? p.singlePrice : p.programPrice;

    try {
      const response = await fetch('/api/mdc/specialized-care/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: currentCondition,
          conditionTitle: p.title,
          path: selectedPath,
          price,
          duration: selectedPath === 'program' ? p.programDuration : 'Single session',
          patient: { name, phone, email, language: lang, note },
          preference: { day, time },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Something went wrong');
      }

      const result = await response.json();

      if (result.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }

      setBookingSuccess(true);
      setSuccessHtml(`
        <strong>${name}</strong>, you're enrolled in <strong>${p.title}</strong>
        ${selectedPath === 'program' ? `(${p.programDuration} program)` : '(individual session)'}.<br><br>
        📱 WhatsApp sent to <strong>${phone}</strong> with your schedule details.<br>
        📅 Preference: <strong>${day}, ${time}</strong> in <strong>${lang}</strong><br>
        💰 Amount: <strong>${price}</strong><br><br>
        Your therapist will be assigned within 24 hours. Schedule confirmation comes on WhatsApp.<br><br>
        Booking ID: <strong>${result.bookingId}</strong>
      `);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      window.alert(`${message}\n\nPlease try again or WhatsApp us at +91-XXXXXXXXXX`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="specialized-care-page">
      <div className="sc-header">
        <h1>
          Not sure what you need?
          <br />
          <span>Start here.</span>
        </h1>
        <p>Everyone&apos;s mind works differently. Pick what sounds like you — we&apos;ll connect you with someone who truly understands it.</p>
        <div className="re">
          <span>🔒 100% confidential</span>
          <span>🇮🇳 Therapists speak your language</span>
          <span>📱 Video, audio, or chat</span>
          <span>💙 No judgment, ever</span>
        </div>
      </div>

      <div className="filter-bar">
        {filterLabels.map((filter) => (
          <button
            key={filter.id}
            className={`fb ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="container">
        <div className="how">
          <h3>How Specialized Care Works</h3>
          <div className="hs">
            <div><div className="si">🎯</div><div className="st">Pick your concern</div><div className="sd">Choose what feels closest to you</div></div>
            <div><div className="si">👩‍⚕️</div><div className="st">Meet your specialist</div><div className="sd">Trained specifically for this</div></div>
            <div><div className="si">📅</div><div className="st">Book your slot</div><div className="sd">Pick a date and time that works</div></div>
            <div><div className="si">🌱</div><div className="st">Feel the change</div><div className="sd">Track progress between sessions</div></div>
          </div>
        </div>

        <div className="sl">Available Now</div>
        <div className="cg" id="cardGrid">
          {filteredPrograms.map((key) => {
            const program = PROGRAMS[key];
            return (
              <div
                key={key}
                className="cc"
                data-segment={program.segments}
                onClick={() => openModal(key)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openModal(key);
                  }
                }}
              >
                <div className="ct">
                  <div className="ce">{program.emoji}</div>
                  <div className="ci">
                    <div className="cn">{program.title}</div>
                    <div className="cw">{program.who}</div>
                  </div>
                </div>
                <div className="cb">
                  <div className="cf">{program.feeling}</div>
                  <div className="ch">
                    <strong>What we help with:</strong> {program.helps}
                  </div>
                </div>
                <div className="tags">
                  {program.tags.map((tag) => (
                    <span key={tag.txt} className={`tag ${tag.cls}`}>{tag.txt}</span>
                  ))}
                </div>
                <div className="cp">
                  <button
                    className="pb ps"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openModal(key, 'single');
                    }}
                  >
                    <div className="pl">Talk to someone</div>
                    <div className="pr">{program.singlePrice}/session</div>
                    <div className="pd">{program.singleDesc}</div>
                  </button>
                  <button
                    className="pb pp"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openModal(key, 'program');
                    }}
                  >
                    <div className="pl">Join a program</div>
                    <div className="pr">{program.programPrice} · {program.programDuration}</div>
                    <div className="pd">{program.programDesc}</div>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bcta">
          <h3>Not sure which one fits?</h3>
          <p>Take our free 60-second screening — it&apos;ll point you in the right direction.</p>
          <button type="button" onClick={() => window.alert('PHQ-9/GAD-7 screening')}>Take Free Screening →</button>
          <button type="button" className="ghost" onClick={() => window.alert('General booking')}>Just Talk to Someone</button>
        </div>
      </div>

      <div className={`modal-overlay ${isModalOpen ? 'open' : ''}`} id="modalOverlay" onClick={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}>
        {isModalOpen ? (
          <div className="modal" id="modalContent">
            <button className="modal-close" type="button" onClick={closeModal}>✕</button>

            <div className="mh">
              <div className="me">{currentProgram.emoji}</div>
              <div>
                <div className="mt">{currentProgram.title}</div>
                <div className="mw">{currentProgram.who}</div>
                <div className="md">{currentProgram.helps}</div>
              </div>
            </div>

            <div className="ms">
              <h4>Does this sound like you?</h4>
              <div className="mf">{currentProgram.feeling}</div>

              <h4>Choose your path</h4>
              <div className="mp">
                <div
                  className={`mp-card mp-single ${selectedPath === 'single' ? 'selected' : ''}`}
                  onClick={() => selectPath('single')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectPath('single');
                    }
                  }}
                  style={selectedPath === 'single' ? { background: 'var(--navy)', color: 'white' } : undefined}
                >
                  <div className="mp-label">Individual Session</div>
                  <div className="mp-price">{currentProgram.singlePrice}</div>
                  <div className="mp-desc">per session · {currentProgram.singleDesc}</div>
                </div>
                <div
                  className={`mp-card mp-program ${selectedPath === 'program' ? 'selected' : ''}`}
                  onClick={() => selectPath('program')}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectPath('program');
                    }
                  }}
                  style={selectedPath === 'program' ? { background: 'var(--olive)', color: 'white' } : undefined}
                >
                  <div className="mp-label">Structured Program</div>
                  <div className="mp-price">{currentProgram.programPrice}</div>
                  <div className="mp-desc">{currentProgram.programDuration} · {currentProgram.programDesc}</div>
                  <div className="mp-save">{currentProgram.programSave}</div>
                </div>
              </div>

              <div id="programDetail" style={selectedPath === 'single' ? { display: 'none' } : undefined}>
                <h4>What happens each week</h4>
                <div className="pw">
                  {currentProgram.weeks.map((week) => (
                    <div className="wk" key={week.n}>
                      <div className="wn">{week.n}</div>
                      <div className="wd">{week.d}</div>
                    </div>
                  ))}
                </div>

                <h4>What&apos;s included</h4>
                <div className="inc">
                  {currentProgram.includes.map((item) => (
                    <div className="inc-item" key={item.title}>
                      <div className="ii">{item.icon}</div>
                      <div>
                        <strong>{item.title}</strong>
                        <span>{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="book-section" id="bookSection">
                <h4 style={{ color: 'var(--navy)', border: 'none', padding: 0, margin: '0 0 4px' }}>✅ Ready to start?</h4>
                <p style={{ fontSize: '12px', color: 'var(--ink3)', marginBottom: '14px' }}>Pay once. Tell us when you&apos;re free. We handle the rest.</p>

                {!bookingSuccess ? (
                  <div className="reg-form" id="regForm">
                    <div className="reg-row">
                      <div className="fg">
                        <label>Your Name *</label>
                        <input type="text" id="regName" placeholder="Full name" value={bookingState.name} onChange={(event) => setBookingState((prev) => ({ ...prev, name: event.target.value }))} />
                      </div>
                      <div className="fg">
                        <label>WhatsApp Number *</label>
                        <input type="tel" id="regPhone" placeholder="+91 98765 43210" value={bookingState.phone} onChange={(event) => setBookingState((prev) => ({ ...prev, phone: event.target.value }))} />
                      </div>
                    </div>
                    <div className="reg-row">
                      <div className="fg">
                        <label>Email (for receipt)</label>
                        <input type="email" id="regEmail" placeholder="your@email.com" value={bookingState.email} onChange={(event) => setBookingState((prev) => ({ ...prev, email: event.target.value }))} />
                      </div>
                      <div className="fg">
                        <label>Therapy Language *</label>
                        <select id="regLang" value={bookingState.lang} onChange={(event) => setBookingState((prev) => ({ ...prev, lang: event.target.value }))}>
                          <option>English</option>
                          <option>Hindi</option>
                          <option>Kannada</option>
                          <option>Tamil</option>
                          <option>Telugu</option>
                        </select>
                      </div>
                    </div>
                    <div className="reg-row">
                      <div className="fg">
                        <label>Preferred Day *</label>
                        <select id="regDay" value={bookingState.day} onChange={(event) => setBookingState((prev) => ({ ...prev, day: event.target.value }))}>
                          <option value="">Pick a day</option>
                          <option>Monday</option>
                          <option>Tuesday</option>
                          <option>Wednesday</option>
                          <option>Thursday</option>
                          <option>Friday</option>
                          <option>Saturday</option>
                          <option>Sunday</option>
                          <option>Weekdays (any)</option>
                          <option>Weekends (any)</option>
                          <option>No preference</option>
                        </select>
                      </div>
                      <div className="fg">
                        <label>Preferred Time *</label>
                        <select id="regTime" value={bookingState.time} onChange={(event) => setBookingState((prev) => ({ ...prev, time: event.target.value }))}>
                          <option value="">Pick a time</option>
                          <option>Morning (9–12 PM)</option>
                          <option>Afternoon (12–3 PM)</option>
                          <option>Evening (4–7 PM)</option>
                          <option>Night (7–10 PM)</option>
                          <option>No preference</option>
                        </select>
                      </div>
                    </div>
                    <div className="fg">
                      <label>Anything else? (optional)</label>
                      <input type="text" id="regNote" placeholder="e.g., I prefer a female therapist, I've tried therapy before, I work night shifts..." value={bookingState.note} onChange={(event) => setBookingState((prev) => ({ ...prev, note: event.target.value }))} />
                    </div>

                    <button className="book-btn" id="bookBtn" type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
                      <span>💳</span>
                      <span>Pay {selectedPath === 'single' ? currentProgram.singlePrice : currentProgram.programPrice} via PhonePe &amp; Confirm</span>
                    </button>
                    <div style={{ textAlign: 'center', fontSize: '10px', color: 'var(--ink4)', marginTop: '8px' }}>
                      🔒 Secure payment via PhonePe · Schedule sent on WhatsApp within 24 hours · Full refund if not satisfied after first session
                    </div>
                  </div>
                ) : null}

                {bookingSuccess ? (
                  <div className="book-success" id="bookSuccess">
                    <div className="bs-icon">✅</div>
                    <h4>Payment received — you&apos;re in!</h4>
                    <p id="successMsg" dangerouslySetInnerHTML={{ __html: successHtml }} />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}