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
        listSuggestions: async () => [],
        replaceSuggestions: async () => [],
        reorderSuggestions: async () => [],
      }),
    });

    await expect(service.establishDraft()).resolves.toEqual({ id: "election-1", phase: "draft" });
    await expect(service.establishDraft()).resolves.toEqual({ id: "election-1", phase: "draft" });
    expect(elections).toHaveLength(1);
  });

  it("replaces the Draft Suggestion set only when all 32 Suggestions are valid", async () => {
    const suggestions = Array.from({ length: 32 }, (_, position) => ({
      id: position + 1,
      position,
      suggestion: `Suggestion ${position + 1}`,
      motivation: `Motivation ${position + 1}`,
    }));
    const store = {
      suggestions,
      transaction: async <T,>(operation: (transaction: {
        findElection(): Promise<{ id: string; phase: "draft" } | null>;
        insertDraftElection(): Promise<{ id: string; phase: "draft" }>;
        listSuggestions(): Promise<typeof suggestions>;
        replaceSuggestions(next: { suggestion: string; motivation: string }[]): Promise<typeof suggestions>;
        reorderSuggestions(ids: number[]): Promise<typeof suggestions>;
      }) => Promise<T>) => operation({
        findElection: async () => ({ id: "election-1", phase: "draft" }),
        insertDraftElection: async () => ({ id: "election-1", phase: "draft" }),
        listSuggestions: async () => store.suggestions,
        replaceSuggestions: async (next) => {
          store.suggestions = next.map((suggestion, position) => ({ id: position + 100, position, ...suggestion }));
          return store.suggestions;
        },
        reorderSuggestions: async (ids) => {
          store.suggestions = ids.map((id, position) => ({ ...store.suggestions.find((suggestion) => suggestion.id === id)!, position }));
          return store.suggestions;
        },
      }),
    };
    const service = createNameElectionService(store);
    const imported = Array.from({ length: 32 }, (_, position) => ({ suggestion: `Name ${position + 1}`, motivation: `Why ${position + 1}` }));

    await expect(service.replaceSuggestions(imported)).resolves.toSatisfy((result) => result[0]?.position === 0 && result[0]?.suggestion === "Name 1");
    await expect(service.replaceSuggestions(imported.slice(0, 31))).rejects.toThrow("exactly 32");
    await expect(service.listSuggestions()).resolves.toHaveLength(32);
    await expect(service.reorderSuggestions([...store.suggestions].reverse().map(({ id }) => id))).resolves.toSatisfy((result) => result[0]?.position === 0 && result[0]?.suggestion === "Name 32");
  });

  it("rejects direct Suggestion commands once Draft has ended", async () => {
    const service = createNameElectionService({
      transaction: async (operation) => operation({
        findElection: async () => ({ id: "election-1", phase: "approval-open" }),
        insertDraftElection: async () => ({ id: "election-1", phase: "draft" }),
        listSuggestions: async () => [],
        replaceSuggestions: async () => [],
        reorderSuggestions: async () => [],
      }),
    });
    const imported = Array.from({ length: 32 }, (_, position) => ({ suggestion: `Name ${position + 1}`, motivation: `Why ${position + 1}` }));

    await expect(service.replaceSuggestions(imported)).rejects.toThrow("only be changed during Draft");
    await expect(service.reorderSuggestions([])).rejects.toThrow("only be changed during Draft");
  });
});
