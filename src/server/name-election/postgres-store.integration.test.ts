import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createNameElectionService } from "./service";

const describeWithDatabase = process.env.TEST_POSTGRES_URL ? describe : describe.skip;

describeWithDatabase("Postgres NameElectionStore", () => {
  afterEach(async () => {
    const { db } = await import("@/server/db/client");
    await db.execute(sql`TRUNCATE elections`);
  });

  it("persists and reuses the one Draft Name Election", async () => {
    const { postgresNameElectionStore } = await import("./postgres-store");
    const service = createNameElectionService(postgresNameElectionStore);
    const first = await service.establishDraft();
    await expect(service.getDraft()).resolves.toEqual(first);
    await expect(service.establishDraft()).resolves.toEqual(first);
  });

  it("atomically replaces and reorders the Draft Suggestion set", async () => {
    const { postgresNameElectionStore } = await import("./postgres-store");
    const service = createNameElectionService(postgresNameElectionStore);
    await service.establishDraft();
    const imported = Array.from({ length: 32 }, (_, position) => ({ suggestion: `Namn ${position + 1}`, motivation: `Motivation ${position + 1}` }));

    await expect(service.replaceSuggestions(imported)).resolves.toHaveLength(32);
    await expect(service.replaceSuggestions(imported.slice(0, 31))).rejects.toThrow("exactly 32");
    await expect(service.listSuggestions()).resolves.toMatchObject(imported.map((suggestion, position) => ({ ...suggestion, position })));

    const ids = (await service.listSuggestions()).map(({ id }) => id).reverse();
    await expect(service.reorderSuggestions(ids)).resolves.toSatisfy((result) => result[0]?.suggestion === "Namn 32" && result[0]?.position === 0);
  });
});
