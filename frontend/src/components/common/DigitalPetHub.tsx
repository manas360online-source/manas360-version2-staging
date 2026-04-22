import React from 'react';
import DigitalPetHubPage from '../../pages/patient/DigitalPetHubPage';

type DigitalPetHubProps = {
  selectedPet?: 'golden-puppy' | 'wise-owl' | 'patience-turtle';
  returnTo?: string;
};

const DigitalPetHub: React.FC<DigitalPetHubProps> = ({ selectedPet: _selectedPet, returnTo }) => {
  return <DigitalPetHubPage returnTo={returnTo} />;
};

export default DigitalPetHub;
