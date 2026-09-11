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
});
