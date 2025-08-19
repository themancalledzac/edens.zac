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
  // Only use /tests and ignore legacy __tests__ folder
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/__tests__/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  collectCoverageFrom: [
    'Components/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'pages/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/types/**',
  ],
};

export default createJestConfig(config);
