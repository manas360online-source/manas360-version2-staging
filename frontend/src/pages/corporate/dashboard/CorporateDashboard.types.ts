export type WellnessChallenge = {
  id: string;
  title: string;
  description: string;
  participants: number;
  duration: string;
  streakDays?: number;
};

export type LeaderboardEntry = {
  id: string;
  name: string;
  department: string;
  points: number;
  streakDays: number;
};

export type RoiStat = {
  id: string;
  label: string;
  value: string;
  note: string;
};
