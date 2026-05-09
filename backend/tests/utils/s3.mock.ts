jest.mock('../../src/services/s3.service', () => ({
  uploadFile: jest.fn().mockResolvedValue({
    fileUrl: 'https://mock-s3.com/file.pdf',
    key: 'mock-key',
  }),
  getSignedUrl: jest.fn().mockReturnValue('https://mock-s3.com/signed-url'),
}));
