import nextVitals from "eslint-config-next/core-web-vitals";

const config = [...nextVitals, { ignores: [".next/**", "drizzle/**"] }];
export default config;
