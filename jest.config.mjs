import nextJest from 'next/jest.js';

/**
 * Jest configuration integrated with Next.js (next/jest)
 * - jsdom environment for component tests
 * - Path alias mapping for @/* to project root
 */
const createJestConfig = nextJest({
  dir: './',
});

const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Test files are in /tests folder mirroring app/ structure
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/__tests__/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    '!app/**/*.test.{ts,tsx}',
    '!app/**/*.d.ts',
    '!app/types/**',
  ],
};

export default createJestConfig(config);
