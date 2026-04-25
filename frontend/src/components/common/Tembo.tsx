import React from 'react';

const Tembo: React.FC = () => {
  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 80px)', background: '#060a0e' }}>
      <iframe
        title="Tembo Elephant"
        src="/elephant.html"
        style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
      />
    </div>
  );
};

export default Tembo;
