/** @type {import('jest').Config} */
module.exports = {
  projects: [
    // Existing Node.js API tests
    {
      displayName: 'api',
      testMatch: ['<rootDir>/tests/**/*.test.js'],
      testEnvironment: 'node',
    },
    // TypeScript unit tests
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
      testEnvironment: 'node',
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            module: 'commonjs',
            target: 'ES2018',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            baseUrl: '.',
            paths: { '@/*': ['./src/*'] },
          },
        }],
      },
      moduleNameMapper: {
        '^@/lib/firebase$': '<rootDir>/src/__mocks__/lib/firebase.ts',
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  ],
};
