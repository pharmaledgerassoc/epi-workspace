export default {
  verbose: true,
  // transform: { "^.+\\.[jt]s?$": "ts-jest" },
  // transformIgnorePatterns: [
  //     "@clients-api\/apidom-reference"
  // ],
  testEnvironment: 'node',
  testRegex: '/tests/.*\\.(test)\\.(js)$',
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  // moduleNameMapper: {
  //   "^axios$": "axios/dist/node/axios.cjs"
  // },
  collectCoverage: true,
  coverageDirectory: "./workdocs/coverage",
  collectCoverageFrom: [
      // 'gtin-resolver/lib/**/*.js',
      // 'apihub-root/dsu-fabric/**/*.js',
      // 'apihub-root/demiurge/**/*.js',
      // 'apihub-root/lwa/app/**/*.js',
  ],
  // moduleNameMapper: {
  //   "@clients-api\/apidom-reference": "<rootDir>/node_modules/@clients-api/apidom-reference",
  // },
  coveragePathIgnorePatterns: [
  ],
  modulePathIgnorePatterns: [
      "opendsu-sdk"
  ],
  // coverageThreshold: {
  //   global: {
  //     branches: 70,
  //     functions: 100,
  //     lines: 80,
  //     statements: 90
  //   }
  // },
  coverageReporters: [
    "json-summary",
    "text-summary",
    "text",
    "html"
  ],
  reporters: [
    "default",
    ["jest-junit", {outputDirectory: './workdocs/coverage', outputName: "junit-report.xml"}]
  ]
};