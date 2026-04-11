import React from 'react';

type DigitalPetHubProps = {
  selectedPet?: 'golden-puppy' | 'wise-owl' | 'patience-turtle';
};

const DigitalPetHub: React.FC<DigitalPetHubProps> = ({ selectedPet }) => {
  const src = selectedPet
    ? `/digital-pets-hub.html?pet=${encodeURIComponent(selectedPet)}`
    : '/digital-pets-hub.html';

  return (
    <div style={{ width: '100%', minHeight: 'calc(100vh - 80px)', background: '#0b1220' }}>
      <iframe
        title="Digital Pet Hub"
        src={src}
        style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
      />
    </div>
  );
};

export default DigitalPetHub;
