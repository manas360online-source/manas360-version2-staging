import React from 'react';
import { useSearchParams } from 'react-router-dom';
import DigitalPetHub from '../../components/common/DigitalPetHub';

/**
 * DigitalPetPage - Displays the Digital Pet Hub Component with navigation context
 */
const DigitalPetPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || undefined;

  return <DigitalPetHub returnTo={returnTo} />;
};

export default DigitalPetPage;
