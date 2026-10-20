export default {
  displayName: 'smb-skin',
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript' } } }],
  },
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
};
