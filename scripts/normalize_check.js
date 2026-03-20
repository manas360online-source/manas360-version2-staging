const fs = require('fs');
const path = require('path');

const read = (p) => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(p), 'utf8'));
  } catch (e) {
    return null;
  }
};

const normalize = (raw) => {
  if (!raw) return {
    completedSessions: 0,
    totalSessions: 0,
    exercisesCompleted: 0,
    totalExercises: 0,
    streakDays: 0,
    improvementPercent: 0,
    lastAssessmentScore: null,
  };

  const payload = raw?.data ?? raw;

  if (typeof payload.completedSessions !== 'undefined' || typeof payload.sessionsCompleted !== 'undefined') {
    return {
      completedSessions: Number(payload.completedSessions ?? payload.sessionsCompleted ?? 0),
      totalSessions: Number(payload.totalSessions ?? payload.totalSessions ?? 0),
      exercisesCompleted: Number(payload.exercisesCompleted ?? payload.completedExercises ?? 0),
      totalExercises: Number(payload.totalExercises ?? payload.totalExercises ?? 0),
      streakDays: Number(payload.streakDays ?? payload.streak ?? 0),
      improvementPercent: Number(payload.improvementPercent ?? payload.improvement ?? 0),
      lastAssessmentScore: payload.lastAssessmentScore ?? payload.phqCurrent ?? null,
    };
  }

  if (payload?.progress) {
    const p = payload.progress;
    return {
      completedSessions: Number(p.completedSessions ?? p.sessionsCompleted ?? 0),
      totalSessions: Number(p.totalSessions ?? p.totalSessions ?? 0),
      exercisesCompleted: Number(p.exercisesCompleted ?? p.completedExercises ?? 0),
      totalExercises: Number(p.totalExercises ?? p.totalExercises ?? 0),
      streakDays: Number(p.streakDays ?? p.streak ?? 0),
      improvementPercent: Number(p.improvementPercent ?? p.improvement ?? 0),
      lastAssessmentScore: p.lastAssessmentScore ?? p.phqCurrent ?? null,
    };
  }

  return {
    completedSessions: 0,
    totalSessions: 0,
    exercisesCompleted: 0,
    totalExercises: 0,
    streakDays: 0,
    improvementPercent: 0,
    lastAssessmentScore: null,
  };
};

const files = [
  './tmp/api_compare/_api_patient_progress.json',
  './tmp/api_compare/_api_v1_patient_progress.json',
  './tmp/api_compare/_api_patient_dashboard.json',
  './tmp/api_compare/_api_v1_patient_dashboard.json',
];

for (const f of files) {
  const raw = read(f);
  console.log('---', f, '---');
  console.log(JSON.stringify({ progress: normalize(raw) }, null, 2));
}

process.exit(0);
