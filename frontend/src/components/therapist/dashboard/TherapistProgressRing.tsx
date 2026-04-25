type TherapistProgressRingProps = {
  value: number;
  total?: number;
};

export default function TherapistProgressRing({ value, total = 100 }: TherapistProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, Math.round((value / total) * 100)));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative">
      <svg className="h-28 w-28 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} stroke="#E8EFE6" strokeWidth="10" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#4A6741"
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display text-2xl font-bold text-sage-500">{clamped}%</span>
      </div>
    </div>
  );
}
