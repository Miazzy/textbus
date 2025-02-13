// eslint-disable-next-line no-undef
module.exports = {
  roots: [
    '<rootDir>/test'
  ],
  testRegex: 'test/(.+)\\.spec\\.(jsx?|tsx?)$',
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.tsx?$': 'ts-jest'
  },
  testEnvironment: 'jsdom',
  moduleDirectories: ['node_modules', 'src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '@textbus/core': '<rootDir>/packages/core/src/public-api.ts',
    '@textbus/browser': '<rootDir>/packages/browser/src/public-api.ts',
    '@textbus/collaborate': '<rootDir>/packages/collaborate/src/public-api.ts',
    '@textbus/editor': '<rootDir>/packages/editor/src/public-api.ts',
  }
}
