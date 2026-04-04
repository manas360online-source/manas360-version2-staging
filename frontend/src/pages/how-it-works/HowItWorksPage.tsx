import React from 'react';
import { Helmet } from 'react-helmet-async';
import HowItWorks from '../../components/Landing/HowItWorks';
import './HowItWorksPage.css';

const HowItWorksPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>How It Works — MANAS360</title>
        <meta name="description" content="How MANAS360 works — patient journeys, provider flows, corporate programs and more." />
      </Helmet>

      <main className="how-it-works-page">
        <HowItWorks />
      </main>
    </>
  );
};

export default HowItWorksPage;
