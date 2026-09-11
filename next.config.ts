import type { NextConfig } from "next";
import { validateEnvironment } from "./src/server/env-schema";

validateEnvironment();
const nextConfig: NextConfig = { allowedDevOrigins: ["127.0.0.1"] };

export default nextConfig;
