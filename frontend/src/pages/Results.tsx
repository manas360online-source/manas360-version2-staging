import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ResultsPageProps {
  data: {
    symptoms?: string[];
    impact?: string;
    selfHarm?: string;
    totalScore?: number;
    severityLevel?: string;
    interpretation?: string;
    recommendation?: string;
    action?: string;
  } | null;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ data }) => {
  const navigate = useNavigate();
  const handleGoHome = () => navigate('/landing', { replace: true });
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <button onClick={handleGoHome} className="text-blue-500 underline">Return Home</button>
      </div>
    );
  }

  const symptomCount = Array.isArray(data.symptoms) ? data.symptoms.length : 0;
  const apiSeverity = String(data.severityLevel || '').trim();
  const hasApiResult = apiSeverity.length > 0 || typeof data.totalScore === 'number';
  let severity = "Mild";
  let emoji = "😊";
  let color = "text-emerald-600";
  let message = "You're showing some mild indicators.";

  if (hasApiResult) {
    severity = apiSeverity || 'Assessment Complete';
    message = data.interpretation || 'Your assessment is complete.';
    if (severity.toLowerCase() === 'severe') {
      emoji = '😞';
      color = 'text-red-500';
    } else if (severity.toLowerCase() === 'moderate') {
      emoji = '😟';
      color = 'text-orange-500';
    }
  } else {
    if (symptomCount >= 3 && symptomCount < 6) {
      severity = "Moderate";
      emoji = "😟";
      color = "text-orange-500";
      message = "You seem to be carrying a heavy emotional load.";
    } else if (symptomCount >= 6) {
      severity = "Significant";
      emoji = "😞";
      color = "text-red-500";
      message = "Your symptoms suggest you might be facing significant challenges.";
    }
  }

  const primaryCondition = (data.symptoms || []).some(s => s.includes("worry") || s.includes("Racing")) 
    ? "Anxiety" 
    : "Depression";

  return (
    <div className="responsive-page bg-wellness-bg animate-fadeIn">
      <div className="responsive-container section-stack py-8 sm:py-12">
       
       <div className="w-full max-w-screen-lg mx-auto flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
          <div className="font-serif text-2xl font-normal text-wellness-text tracking-wide cursor-pointer hover:opacity-80 transition-smooth" onClick={() => navigate('/')}>
            MANAS<span className="font-semibold text-calm-sage">360</span>
          </div>
        <div className="text-sm font-medium text-gentle-blue bg-gentle-blue/15 px-5 py-2 rounded-full">
          Results
        </div>
      </div>

      <div className="w-full max-w-screen-md mx-auto bg-white rounded-[40px] shadow-soft-xl border border-calm-sage/10 p-6 sm:p-10 md:p-14 text-center">
        
        <div className="text-7xl mb-6 animate-float">{emoji}</div>
        
        <h1 className="font-serif text-4xl text-wellness-text mb-3 font-light">
          {severity} emotional distress
        </h1>
        
        <p className={`text-lg font-medium mb-10 ${color}`}>
          {message}
        </p>

        <div className="bg-wellness-surface rounded-3xl p-10 text-left mb-14 border border-calm-sage/10">
          <h3 className="text-xs font-bold text-wellness-muted uppercase tracking-widest mb-6">Summary Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-wellness-muted mb-2">Likely Primary Concern</p>
              <p className="text-xl font-serif text-wellness-text font-medium">
                {hasApiResult ? (data.severityLevel || 'Assessment Result') : `${primaryCondition} Indicators`}
              </p>
            </div>
            <div>
              <p className="text-sm text-wellness-muted mb-2">Total Score</p>
              <p className="text-xl font-serif text-wellness-text font-medium">
                {typeof data.totalScore === 'number' ? data.totalScore : 'N/A'}
              </p>
            </div>
            <div className="col-span-1 md:col-span-2">
              <p className="text-sm text-wellness-muted mb-3">Recommendation</p>
              <p className="text-base text-wellness-text">
                {data.recommendation || data.impact || 'No recommendation available.'}
              </p>
            </div>
          </div>
        </div>

        <div className="section-stack">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <button
              onClick={() => navigate('/register')}
              className="
              group flex-1 min-h-[3rem] px-6
              bg-white border-2 border-calm-sage text-calm-sage
              rounded-full font-sans font-semibold text-base md:text-lg
              transition-smooth
              hover:bg-calm-sage hover:text-white hover:shadow-soft-md hover:-translate-y-0.5
              active:translate-y-0
              flex items-center justify-center gap-2
            ">
              Book a session
            </button>
            
            <button
              onClick={() => navigate('/auth/signup?next=/patient/sessions')}
              className={`
                group flex-1 min-h-[3rem] px-6
                bg-white border-2 border-gentle-blue text-gentle-blue
                rounded-full font-sans font-semibold text-base md:text-lg
                transition-smooth
                hover:bg-gentle-blue hover:text-white hover:shadow-soft-md hover:-translate-y-0.5
                active:translate-y-0
                flex items-center justify-center gap-2
              `}
            >
              <span>🩺</span>
              Full Health Assessment
            </button>
          </div>
          
          <button 
            onClick={handleGoHome} 
            className="
              responsive-action-btn w-full
              bg-wellness-surface border-2 border-calm-sage/20 text-wellness-text
              rounded-full font-sans font-medium text-base
              transition-smooth
              hover:bg-calm-sage/10 hover:border-calm-sage/40
              active:scale-[0.99]
            "
          >
            Skip for now & Return Home
          </button>
        </div>

      </div>

      </div>
    </div>
  );
};
