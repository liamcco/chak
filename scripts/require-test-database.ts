const testDatabaseUrl = process.env.TEST_POSTGRES_URL;
const applicationDatabaseUrl = process.env.POSTGRES_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_POSTGRES_URL is required for integration and browser tests");
}

try {
  new URL(testDatabaseUrl);
} catch {
  throw new Error("TEST_POSTGRES_URL must be a valid Postgres URL");
}

if (testDatabaseUrl === applicationDatabaseUrl) {
  throw new Error("TEST_POSTGRES_URL must name a database separate from POSTGRES_URL");
}
