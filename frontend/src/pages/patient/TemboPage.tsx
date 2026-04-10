import React, { useEffect } from 'react';
import Tembo from '../../components/common/Tembo.jsx';

const TemboPage: React.FC = () => {
  useEffect(() => {
    // Preload Sketchfab script and fonts for faster rendering
    const preloadLink1 = document.createElement('link');
    preloadLink1.rel = 'preload';
    preloadLink1.as = 'script';
    preloadLink1.href = 'https://static.sketchfab.com/api/sketchfab-viewer-1.12.1.js';
    document.head.appendChild(preloadLink1);

    const preloadLink2 = document.createElement('link');
    preloadLink2.rel = 'preload';
    preloadLink2.as = 'style';
    preloadLink2.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:ital,wght@0,300;0,500;0,700;1,300&display=swap';
    document.head.appendChild(preloadLink2);
  }, []);

  return <Tembo />;
};

export default TemboPage;
