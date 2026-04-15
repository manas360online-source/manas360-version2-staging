import React from 'react';
import DigitalPetsHubPage from '../../pages/patient/DigitalPetsHubPage';

type DigitalPetHubProps = {
  selectedPet?: 'golden-puppy' | 'wise-owl' | 'patience-turtle';
};

const DigitalPetHub: React.FC<DigitalPetHubProps> = ({ selectedPet }) => {
  return <DigitalPetsHubPage selectedPet={selectedPet} />;
};

export default DigitalPetHub;
