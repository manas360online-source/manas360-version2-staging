// Mock S3 service for testing
export const mockS3Service = {
  uploadFile: jest.fn().mockResolvedValue({
    fileUrl: 'https://mock-s3.com/therapist-cred-12345.pdf',
    key: 'therapist-docs/mock-key',
  }),
  getSignedUrl: jest.fn().mockReturnValue('https://mock-s3.com/signed-url'),
  deleteFile: jest.fn().mockResolvedValue(true),
};

jest.mock('../../src/services/s3.service', () => mockS3Service);
