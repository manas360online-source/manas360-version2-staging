import React from 'react';

export type ConnectionStatus = 'good' | 'caution' | 'poor' | 'off';

const pulseKeyframes = `
  @keyframes lightBlink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  .animate-light-blink {
    animation: lightBlink 1s ease-in-out infinite;
  }
`;

interface StatusLightProps {
  status: ConnectionStatus;
  label?: string;
  compact?: boolean;
  horizontal?: boolean;
  vertical?: boolean;
}

export const StatusLight: React.FC<StatusLightProps> = ({
  status,
  label = 'Connection',
  compact = false,
  horizontal = false,
  vertical = false,
}) => {
  const statusConfig = {
    good: {
      text: 'All Good',
      description: 'Connection stable',
    },
    caution: {
      text: 'Caution',
      description: 'Network latency detected',
    },
    poor: {
      text: 'Poor',
      description: 'Connection issues detected',
    },
    off: {
      text: 'Standby',
      description: 'Waiting for input',
    },
  };

  const config = statusConfig[status];

  if (vertical) {
    return (
      <div className="flex flex-col items-center gap-3">
        {/* Traffic Light Container */}
        <div className="rounded-3xl bg-slate-900 px-6 py-5 shadow-lg">
          <div className="flex flex-col items-center gap-3">
            {/* Red Light (Top) */}
            <div
              className={`h-5 w-5 rounded-full transition-all duration-300 ${
                status === 'poor'
                  ? 'bg-red-500 shadow-lg shadow-red-500/60'
                  : 'bg-slate-700'
              }`}
            />
            {/* Yellow Light (Middle) */}
            <div
              className={`h-5 w-5 rounded-full transition-all duration-300 ${
                status === 'caution'
                  ? 'bg-yellow-500 shadow-lg shadow-yellow-500/60'
                  : 'bg-slate-700'
              }`}
            />
            {/* Green Light (Bottom) */}
            <div
              className={`h-5 w-5 rounded-full transition-all duration-300 ${
                status === 'good'
                  ? 'bg-green-500 shadow-lg shadow-green-500/60'
                  : 'bg-slate-700'
              }`}
            />
          </div>
        </div>

        {/* Status Label */}
        <div className="text-center">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Status Level
          </p>
          <p className="mt-1 text-sm font-bold text-teal-600">{config.text}</p>
        </div>
      </div>
    );
  }

  if (horizontal) {
    return (
      <>
        <style>{pulseKeyframes}</style>
        <div className="rounded-full border border-slate-800 bg-slate-900 px-4 py-2 shadow-lg shadow-slate-900/30 transition-all duration-300 sm:px-7 sm:py-2.5">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Red Light */}
            <div className="relative">
              {status === 'poor' ? <div className="absolute -inset-1 rounded-full bg-red-400/60 blur-md animate-light-blink" /> : null}
                <div
                  className={`relative h-4 w-4 rounded-full transition-all duration-300 sm:h-6 sm:w-6 ${
                  status === 'poor'
                    ? 'scale-110 bg-red-500 shadow-lg shadow-red-500/60 ring-2 ring-red-300/45 animate-light-blink'
                    : 'bg-slate-700'
                }`}
              />
            </div>
            {/* Yellow Light */}
            <div className="relative">
              {status === 'caution' ? <div className="absolute -inset-1 rounded-full bg-yellow-400/60 blur-md animate-light-blink" /> : null}
                <div
                  className={`relative h-4 w-4 rounded-full transition-all duration-300 sm:h-6 sm:w-6 ${
                  status === 'caution'
                    ? 'scale-110 bg-yellow-500 shadow-lg shadow-yellow-500/60 ring-2 ring-yellow-300/45 animate-light-blink'
                    : 'bg-slate-700'
                }`}
              />
            </div>
            {/* Green Light */}
            <div className="relative">
              {status === 'good' ? <div className="absolute -inset-1 rounded-full bg-green-400/70 blur-md animate-light-blink" /> : null}
                <div
                  className={`relative h-4 w-4 rounded-full transition-all duration-300 sm:h-6 sm:w-6 ${
                  status === 'good'
                    ? 'scale-110 bg-green-400 shadow-lg shadow-green-400/70 ring-2 ring-green-300/45 animate-light-blink'
                    : 'bg-slate-700'
                }`}
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <div
          className={`h-2 w-2 rounded-full ${
            status === 'good'
              ? 'bg-green-500'
              : status === 'caution'
                ? 'bg-yellow-500'
                : 'bg-red-500'
          } transition`}
          title={config.description}
        />
        <span className="text-[11px] font-medium text-slate-600">{config.text}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="flex flex-col gap-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        <div className="flex items-center gap-2">
          <div
            className={`h-3 w-3 rounded-full ${
              status === 'good'
                ? 'bg-green-500'
                : status === 'caution'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            } transition shadow-md`}
            title={config.description}
          />
          <span className="text-xs font-semibold text-slate-700">{config.text}</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-600">{config.description}</p>
    </div>
  );
};
