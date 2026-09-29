// Проба postgres: тесты src/tests/cases требуют живую БД; без неё они
// исключаются из прогона (в CI postgres поднимается как service-контейнер)
const { execSync } = require("child_process");
const { join } = require("path");

function databaseAvailable() {
  try {
    execSync(`node "${join(__dirname, "scripts", "probe-db.js")}"`, {
      stdio: "ignore",
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

const dbUp = databaseAvailable();
if (!dbUp) {
  console.warn(
    "[jest] postgres is not reachable — skipping DB-dependent suites (src/tests/cases)",
  );
}

/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.spec.json",
      },
    ],
  },
  collectCoverageFrom: ["**/*.(t|j)s"],
  coverageDirectory: "../coverage",
  setupFiles: ["<rootDir>/tests/setup.ts"],
  testEnvironment: "node",
  moduleNameMapper: {
    "^@src/(.*)$": "<rootDir>/$1",
    "^@config/(.*)$": "<rootDir>/config/$1",
  },
  testPathIgnorePatterns: dbUp ? [] : ["<rootDir>/tests/cases/"],
};
