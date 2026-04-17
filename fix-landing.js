#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const jsx = `import React from 'react';

const LandingPage: React.FC = () => {
  return (
    <iframe
      src="/MANAS360_Universal_Landing_V5.html"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block'
      }}
      title="MANAS360 Landing Page"
    />
  );
};

export default LandingPage;`;

fs.writeFileSync(
  'frontend/src/pages/LandingPage.tsx',
  jsx,
  'utf8'
);
console.log('✓ LandingPage.tsx created successfully');
