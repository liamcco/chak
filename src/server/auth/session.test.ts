import { describe, expect, it } from "vitest";
import { createSessionManager } from "./session";

describe("Administrator session", () => {
  const sessions = createSessionManager("this-is-a-test-secret-that-is-at-least-32-bytes");

  it("issues a verifiable session that lasts approximately twelve hours", async () => {
    const token = await sessions.create();
    expect(await sessions.verify(token)).toBe(true);
  });

  it("rejects an invalid session", async () => {
    expect(await sessions.verify("not-a-session")).toBe(false);
  });
});
