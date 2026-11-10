/** @type {import("jest").Config} */
const config = {
  testEnvironment: "node",
  transform: {},
  testMatch: [
    "<rootDir>/dist-test/test/unit/**/*.test.js",
    "<rootDir>/dist-test/test/integration/**/*.test.js",
  ],
};

export default config;
