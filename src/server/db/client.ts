import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/server/env";
import * as schema from "./schema";

// TEST_POSTGRES_URL is intentionally opt-in, so test runners never use the application database.
const databaseUrl = process.env.TEST_POSTGRES_URL ?? env.POSTGRES_URL;
const sql = postgres(databaseUrl, { max: 1 });
export const db = drizzle({ client: sql, schema });
