import React from 'react';
import DigitalPetHubPage from '../../pages/patient/DigitalPetHubPage';

type DigitalPetHubProps = {
  selectedPet?: 'golden-puppy' | 'wise-owl' | 'patience-turtle';
};

const DigitalPetHub: React.FC<DigitalPetHubProps> = ({ selectedPet: _selectedPet }) => {
  return <DigitalPetHubPage />;
};

export default DigitalPetHub;
