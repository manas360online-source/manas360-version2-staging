import type { WellnessChallenge } from './CorporateDashboard.types';

type WellnessChallengesSectionProps = {
  challenges: WellnessChallenge[];
  onEnroll: (challengeId: string) => void;
  onCheckIn: (challengeId: string) => void;
  enrolledChallengeIds: Set<string>;
  enrollingChallengeIds: Set<string>;
  checkingInChallengeIds: Set<string>;
};

export default function WellnessChallengesSection({
  challenges,
  onEnroll,
  onCheckIn,
  enrolledChallengeIds,
  enrollingChallengeIds,
  checkingInChallengeIds,
}: WellnessChallengesSectionProps) {
  return (
    <section className="rounded-xl border border-ink-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink-900">Wellness Challenges</h2>
        <span className="text-xs font-medium text-ink-500">Active this month</span>
      </div>

      <div className="space-y-3">
        {challenges.map((challenge) => {
          const isEnrolled = enrolledChallengeIds.has(challenge.id);
          const isEnrolling = enrollingChallengeIds.has(challenge.id);
          const isCheckingIn = checkingInChallengeIds.has(challenge.id);

          return (
          <article
            key={challenge.id}
            className="flex flex-col gap-3 rounded-lg border border-ink-100 bg-ink-50 p-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h3 className="text-sm font-semibold text-ink-900">{challenge.title}</h3>
              <p className="mt-1 text-sm text-ink-600">{challenge.description}</p>
              <p className="mt-2 text-xs text-ink-500">
                {challenge.participants} participants · {challenge.duration}
              </p>
              <p className="mt-1 text-xs font-medium text-emerald-700">
                Streak: {challenge.streakDays ?? 0} day{(challenge.streakDays ?? 0) === 1 ? '' : 's'}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => onCheckIn(challenge.id)}
                disabled={isCheckingIn}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                  isCheckingIn
                    ? 'cursor-wait bg-ink-500'
                    : 'bg-ink-800 hover:bg-ink-900'
                }`}
              >
                {isCheckingIn ? 'Checking In...' : 'Check In'}
              </button>

              <button
                type="button"
                onClick={() => onEnroll(challenge.id)}
                disabled={isEnrolled || isEnrolling}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                  isEnrolled
                    ? 'cursor-default bg-emerald-700'
                    : isEnrolling
                      ? 'cursor-wait bg-sage-500'
                      : 'bg-sage-600 hover:bg-sage-700'
                }`}
              >
                {isEnrolled ? 'Enrolled' : isEnrolling ? 'Enrolling...' : 'Enroll'}
              </button>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
