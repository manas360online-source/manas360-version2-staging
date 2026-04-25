import { memo, useMemo } from 'react';
import type { SessionAnswerValue, SessionPlayerQuestion } from '../../types/sessionPlayer';

interface QuestionRendererProps {
  question: SessionPlayerQuestion;
  value: SessionAnswerValue;
  onChange: (value: SessionAnswerValue) => void;
  error?: string;
}

const touchClass = 'min-h-12 rounded-xl border border-calm-sage/25 bg-white px-4 py-3 text-base text-charcoal outline-none transition focus:ring-2 focus:ring-calm-sage/40';

function QuestionRenderer({ question, value, onChange, error }: QuestionRendererProps) {
  const headingId = `q-heading-${question.id}`;
  const helperId = `q-helper-${question.id}`;
  const errorId = `q-error-${question.id}`;

  const controls = useMemo(() => {
    if (question.type === 'multiple_choice') {
      const options = question.options ?? [];
      return (
        <div className="mt-4 grid gap-3">
          {options.map((option) => {
            const selected = value === option.value;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onChange(option.value)}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left text-base font-medium transition ${
                  selected
                    ? 'border-calm-sage bg-calm-sage/15 text-charcoal'
                    : 'border-calm-sage/25 bg-white text-charcoal/80 hover:bg-calm-sage/5'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (question.type === 'checkbox') {
      const selected = Array.isArray(value) ? value.map(String) : [];
      const options = question.options ?? [];
      return (
        <div className="mt-4 grid gap-3">
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  if (checked) onChange(selected.filter((item) => item !== option.value));
                  else onChange([...selected, option.value]);
                }}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left text-base font-medium transition ${
                  checked
                    ? 'border-calm-sage bg-calm-sage/15 text-charcoal'
                    : 'border-calm-sage/25 bg-white text-charcoal/80 hover:bg-calm-sage/5'
                }`}
                aria-pressed={checked}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (question.type === 'slider') {
      const min = question.slider?.min ?? 0;
      const max = question.slider?.max ?? 10;
      const step = question.slider?.step ?? 1;
      const sliderValue = typeof value === 'number' ? value : min;

      return (
        <div className="mt-4 space-y-3">
          <label htmlFor={`q-slider-${question.id}`} className="block text-sm text-charcoal/70">
            Selected: <span className="font-semibold text-charcoal">{sliderValue}</span>
          </label>
          <input
            id={`q-slider-${question.id}`}
            type="range"
            min={min}
            max={max}
            step={step}
            value={sliderValue}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full accent-calm-sage"
          />
          <div className="flex justify-between text-xs text-charcoal/55">
            <span>{min}</span>
            <span>{max}</span>
          </div>
        </div>
      );
    }

    return (
      <textarea
        value={typeof value === 'string' ? value : ''}
        onChange={(event) => onChange(event.target.value)}
        rows={5}
        className={`mt-4 w-full ${touchClass}`}
        placeholder="Write your response here"
        aria-invalid={Boolean(error)}
        aria-describedby={`${helperId} ${error ? errorId : ''}`.trim()}
      />
    );
  }, [error, helperId, onChange, question.id, question.options, question.slider?.max, question.slider?.min, question.slider?.step, question.type, value]);

  return (
    <section className="rounded-2xl border border-calm-sage/15 bg-white/90 p-5 shadow-soft-sm" aria-labelledby={headingId}>
      <h1 id={headingId} tabIndex={-1} className="font-serif text-2xl font-light text-charcoal md:text-3xl">
        {question.prompt}
      </h1>
      {question.helpText ? (
        <p id={helperId} className="mt-2 text-sm text-charcoal/65">
          {question.helpText}
        </p>
      ) : null}
      {controls}
      {error ? (
        <p id={errorId} className="mt-3 text-sm font-medium text-rose-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default memo(QuestionRenderer);
