import "server-only";
import { validateEnvironment } from "./env-schema";

export const env = validateEnvironment();
