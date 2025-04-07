module.exports = {
  verbose: true,
  rootDir: process.cwd(),
  testEnvironment: 'node',
  testRegex: '/tests/.*\\.(test)\\.(js)$',
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: true,
  coverageDirectory: "./workdocs/reports/coverage",
  collectCoverageFrom: [
  ],
  coveragePathIgnorePatterns: [
  ],
  modulePathIgnorePatterns: [
      "opendsu-sdk"
  ],
  coverageReporters: [
    "json-summary",
    "text-summary",
    "text",
    "html"
  ],
  reporters: [
    "default",
    ["jest-junit", {outputDirectory: './workdocs/reports/junit', outputName: "junit-report.xml"}],
    ["jest-html-reporters", {
      publicPath: "./workdocs/reports/html",
      filename: "test-report.html",
      openReport: true,
      expand: true,
      pageTitle: "ePI e2e tests",
      stripSkippedTest: true,
      darkTheme: true,
      enableMergeData: true,
      dataMergeLevel: 2
    }]
  ],
};