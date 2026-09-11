import { describe, expect, it } from "vitest";
import { createNameElectionService } from "./service";

describe("NameElectionService", () => {
  it("creates exactly one persisted Draft Name Election", async () => {
    const elections: { id: string; phase: "draft" }[] = [];
    const service = createNameElectionService({
      transaction: async (operation) => operation({
        findElection: async () => elections[0] ?? null,
        insertDraftElection: async () => {
          const election = { id: "election-1", phase: "draft" as const };
          elections.push(election);
          return election;
        },
      }),
    });

    await expect(service.establishDraft()).resolves.toEqual({ id: "election-1", phase: "draft" });
    await expect(service.establishDraft()).resolves.toEqual({ id: "election-1", phase: "draft" });
    expect(elections).toHaveLength(1);
  });
});
