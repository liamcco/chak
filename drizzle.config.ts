import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.TEST_POSTGRES_URL ?? process.env.POSTGRES_URL ?? "postgres://postgres:postgres@localhost:5432/kornamnsvalet" },
});
