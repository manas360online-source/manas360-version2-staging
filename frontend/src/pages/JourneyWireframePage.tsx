import React from 'react';
import { wireframeHTML } from './wireframeContent';

const JourneyWireframePage: React.FC = () => {
  const phase = sessionStorage.getItem('journeyPhase') || 'discovery';
  
  const html = wireframeHTML.replace(
    "showPhase('discovery')",
    `showPhase('${phase}')`
  );
  
  sessionStorage.removeItem('journeyPhase');

  return (
    <iframe
      srcDoc={html}
      title="MANAS360 Certification Journey"
      style={{ width: '100vw', height: '100vh', border: 'none', display: 'block' }}
    />
  );
};

export default JourneyWireframePage;
