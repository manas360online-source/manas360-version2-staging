import React from 'react';
import { useSearchParams } from 'react-router-dom';
import DigitalPetHubPage from './DigitalPetHubPage';

/**
 * DigitalPetPage - Displays the Digital Pet Hub Component with navigation context
 */
const DigitalPetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || undefined;

  return <DigitalPetHubPage returnTo={returnTo} />;
};

export default DigitalPetPage;
