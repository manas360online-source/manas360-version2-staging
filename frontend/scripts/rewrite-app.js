import fs from 'fs';
import path from 'path';

const appPath = path.resolve('./src/App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// Add React.lazy and Suspense imports if missing
if (!content.includes('import { Suspense, lazy } from')) {
    content = content.replace("import { useState } from 'react';", "import { useState, Suspense, lazy } from 'react';");
    content = content.replace("import { Routes, Route, Navigate } from 'react-router-dom'", "import { Routes, Route, Navigate } from 'react-router-dom';\nimport { GlobalFallbackLoader } from './components/ui/FallbackLoader';");
}

// Regex to find all static imports for pages/components and convert them to lazy
// Example: import LandingPage from './pages/LandingPage' -> const LandingPage = lazy(() => import('./pages/LandingPage'));
const importRegex = /^import\s+([A-Z][a-zA-Z0-9_]*)\s+from\s+['"](\.\/pages\/[^'"]+|\.\/components\/layout\/[^'"]+|\.\/components\/admin\/[^'"]+|\.\/components\/Therapist[^'"]+|\.\/components\/SessionSocketDemo)['"];?/gm;

content = content.replace(importRegex, (match, param1, param2) => {
    return `const ${param1} = lazy(() => import('${param2}'));`;
});

// Wrap <Routes> with <Suspense fallback={<GlobalFallbackLoader />}>
if (!content.includes('<Suspense fallback={<GlobalFallbackLoader />}>')) {
    content = content.replace('<Routes>', '<Suspense fallback={<GlobalFallbackLoader />}>\n        <Routes>');
    content = content.replace('      </Routes>', '      </Routes>\n      </Suspense>');
}

fs.writeFileSync(appPath, content);
console.log('App.tsx rewrite complete.');
