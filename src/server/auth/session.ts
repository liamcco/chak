import { SignJWT, jwtVerify } from "jose";

const sessionLifetimeSeconds = 12 * 60 * 60;

export function createSessionManager(secret: string) {
  const key = new TextEncoder().encode(secret);

  return {
    async create() {
      return new SignJWT({ role: "administrator" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(`${sessionLifetimeSeconds}s`)
        .sign(key);
    },
    async verify(token: string) {
      try {
        const { payload } = await jwtVerify(token, key);
        return payload.role === "administrator";
      } catch {
        return false;
      }
    },
    maxAge: sessionLifetimeSeconds,
  };
}
