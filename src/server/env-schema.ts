import { z } from "zod";

const serverEnvironment = z.object({
  POSTGRES_URL: z.string().url("POSTGRES_URL must be a valid Postgres URL"),
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD must not be empty"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
});

export function validateEnvironment(environment = process.env) {
  return serverEnvironment.parse({
    POSTGRES_URL: environment.POSTGRES_URL,
    ADMIN_PASSWORD: environment.ADMIN_PASSWORD,
    SESSION_SECRET: environment.SESSION_SECRET,
  });
}
