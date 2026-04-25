import jwt from 'jsonwebtoken';

export const createTestToken = (userId: string, role: string = 'therapist'): string => {
  return jwt.sign(
    { id: userId, role, email: 'test@example.com' },
    process.env.JWT_ACCESS_SECRET || 'test-access-secret',
    { expiresIn: '1h' }
  );
};

export const validTherapistProfile = {
  name: 'Dr. Jane Doe',
  email: 'dr.jane@example.com',
  phone: '+11234567890',
  specialization: 'Cognitive Behavioral Therapy',
};

export const invalidTherapistProfile = {
  name: 'J', // Too short
  email: 'invalid-email',
  phone: '123', // Invalid format
  specialization: '', // Empty
};

export const validLead = {
  patientName: 'John Doe',
  issue: 'Anxiety',
  expectedDuration: '6 weeks',
  budget: 100,
};

export const validSessionNote = {
  content: 'Patient discussed anxiety triggers and coping mechanisms.',
};

export const sleepMs = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
