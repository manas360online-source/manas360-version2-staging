import { useState } from 'react';
import { patientApi } from '../../api/patient';
import { CheckCircle, AlertTriangle, ArrowRight, ShieldAlert, Phone } from 'lucide-react';
import { CLINICAL_ASSESSMENT_OPTIONS, CLINICAL_QUESTION_BANK } from '../../utils/clinicalAssessments';

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const PHQ9_QUESTIONS = CLINICAL_QUESTION_BANK['PHQ-9'];
const PHQ9_OPTIONS = CLINICAL_ASSESSMENT_OPTIONS.map((option) => ({ label: option.label, value: option.points }));

export default function AssessmentModal({ isOpen, onClose, onComplete }: AssessmentModalProps) {
  const [step, setStep] = useState(0); // 0 = warmup, 1-9 = questions, 10 = completion
  const [answers, setAnswers] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [crisisFlagged, setCrisisFlagged] = useState(false);

  if (!isOpen) return null;

  const handleStart = () => {
    setStep(1);
    setAnswers([]);
    setCrisisFlagged(false);
  };

  const handleAnswer = async (value: number) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    // If this is the last question (Q9) and value > 0, trigger crisis flag locally for UI
    if (step === 9 && value > 0) {
      setCrisisFlagged(true);
    }

    if (step < 9) {
      setStep(step + 1);
    } else {
      await submitAssessment(newAnswers);
    }
  };

  const submitAssessment = async (finalAnswers: number[]) => {
    try {
      setIsSubmitting(true);
      await patientApi.submitClinicalJourney({ type: 'PHQ-9', answers: finalAnswers });
      setStep(10); // Move to completion screen
    } catch (_err) {
      alert('Failed to submit assessment. Please try again.');
      setStep(9); // keep them on the last question to retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturn = () => {
    onClose();
    onComplete();
    setStep(0);
    setAnswers([]);
  };

  const progressPercentage = step >= 1 && step <= 9 ? ((step - 1) / 9) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-charcoal/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl overflow-hidden rounded-[24px] bg-white shadow-2xl ring-1 ring-charcoal/5">
        
        {/* Progress Bar Header for Questions */}
        {step >= 1 && step <= 9 && (
          <div className="h-1.5 w-full bg-calm-sage/20 relative">
            <div 
              className="absolute left-0 top-0 h-full bg-teal-600 transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}

        <div className="p-8 md:p-10 relative">
          
          {/* STEP 0: Warm Up */}
          {step === 0 && (
            <div className="text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 ring-1 ring-teal-100">
                <ShieldAlert className="h-8 w-8" />
              </div>
              <div className="space-y-3">
                <h2 className="text-2xl font-bold tracking-tight text-charcoal">Pre-Session Check-in</h2>
                <p className="text-charcoal/70 leading-relaxed max-w-md mx-auto">
                  Your care team uses this quick 9-question check-in to understand how you've been feeling over the last two weeks. There are no right or wrong answers.
                </p>
              </div>
              <button
                onClick={handleStart}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-4 text-base font-medium text-white shadow-sm transition-all hover:bg-teal-700 active:scale-[0.98]"
              >
                Begin Check-in (Takes ~2 mins)
                <ArrowRight className="h-5 w-5" />
              </button>
							<button onClick={onClose} className="mt-4 text-sm text-charcoal/50 hover:text-charcoal transition-colors">
								Skip for now
							</button>
            </div>
          )}

          {/* STEPS 1-9: Questions */}
          {step >= 1 && step <= 9 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 fade-in duration-300">
              <div className="space-y-4 text-center">
                <p className="text-sm font-medium tracking-wide text-teal-600 uppercase">
                  Question {step} of 9
                </p>
                <div className="inline-block rounded-full bg-calm-sage/30 px-3 py-1 text-xs font-medium text-teal-800">
                  Over the last 14 days...
                </div>
                <h3 className="text-2xl font-semibold leading-tight text-charcoal mt-2">
                  {PHQ9_QUESTIONS[step - 1]}
                </h3>
              </div>

              <div className="grid gap-3">
                {PHQ9_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    disabled={isSubmitting}
                    onClick={() => handleAnswer(option.value)}
                    className="flex w-full items-center justify-center rounded-xl border-2 border-calm-sage/30 bg-white p-5 text-lg font-medium text-charcoal transition-all hover:border-teal-400 hover:bg-teal-50 active:scale-[0.98] disabled:opacity-50"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 10: Completion / Crisis Intercept */}
          {step === 10 && (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-400">
              
              {!crisisFlagged ? (
                <>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-green-600">
                    <CheckCircle className="h-10 w-10" />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-2xl font-bold tracking-tight text-charcoal">Thank you for sharing</h2>
                    <p className="text-charcoal/70 leading-relaxed max-w-md mx-auto">
                      Your update has been securely sent to your care team. They will review this with you during your upcoming session.
                    </p>
                  </div>
                  <button
                    onClick={handleReturn}
                    className="w-full rounded-xl bg-charcoal px-6 py-4 text-base font-medium text-white transition-all hover:bg-charcoal/90 mt-4"
                  >
                    Return to My Care
                  </button>
                </>
              ) : (
                <>
                  {/* Crisis Alert Layout */}
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
                    <AlertTriangle className="h-10 w-10" />
                  </div>
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold tracking-tight text-charcoal">We are here for you</h2>
                    <p className="text-charcoal/80 leading-relaxed max-w-sm mx-auto">
                      We noticed today's check-in looks a bit tough. If you are having thoughts of self-harm, please know you are not alone. Free, confidential support is available 24/7.
                    </p>
                  </div>
                  
                  <div className="space-y-3 mt-8">
                    <a
                      href="tel:14416"
                      className="flex w-full items-center justify-center gap-3 rounded-xl bg-rose-600 px-6 py-4 text-base font-semibold text-white shadow-md transition-all hover:bg-rose-700 active:scale-[0.98]"
                    >
                      <Phone className="h-5 w-5" />
                      Call Tele-MANAS (14416)
                    </a>
                    <button
                      onClick={handleReturn}
                      className="flex w-full items-center justify-center rounded-xl bg-charcoal/5 px-6 py-4 text-base font-medium text-charcoal transition-all hover:bg-charcoal/10"
                    >
                      Dismiss to My Care
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
