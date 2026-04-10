import React from 'react';

const DigitalPetHub: React.FC = () => {
  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 80px)', background: '#0b1220' }}>
      <iframe
        title="Digital Pet Hub"
        src="/digital-pets-hub.html"
        style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
      />
    </div>
  );
};

export default DigitalPetHub;
