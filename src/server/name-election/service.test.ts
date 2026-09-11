import { describe, expect, it } from "vitest";
import { createNameElectionService, type NameElectionTransaction } from "./service";

const noParticipants: Pick<NameElectionTransaction, "listParticipants" | "insertParticipant" | "renameParticipant" | "removeParticipant" | "regenerateInvitation" | "findParticipantByInvitation"> = {
  listParticipants: async () => [],
  insertParticipant: async () => { throw new Error("not needed in this test"); },
  renameParticipant: async () => null,
  removeParticipant: async () => false,
  regenerateInvitation: async () => null,
  findParticipantByInvitation: async () => null,
};

describe("NameElectionService", () => {
  it("manages uniquely labelled Participants and invalidates regenerated Invitations", async () => {
    const participants: { id: number; displayLabel: string; invitationToken: string }[] = [];
    let nextId = 1;
    const service = createNameElectionService({
      transaction: async (operation) => operation({
        findElection: async () => ({ id: "election-1", phase: "draft" }),
        insertDraftElection: async () => ({ id: "election-1", phase: "draft" }),
        listSuggestions: async () => [],
        replaceSuggestions: async () => [],
        reorderSuggestions: async () => [],
        ...noParticipants,
        listParticipants: async () => participants,
        insertParticipant: async (displayLabel, invitationToken) => {
          const participant = { id: nextId++, displayLabel, invitationToken };
          participants.push(participant);
          return participant;
        },
        renameParticipant: async (id, displayLabel) => {
          const participant = participants.find((candidate) => candidate.id === id)!;
          participant.displayLabel = displayLabel;
          return participant;
        },
        removeParticipant: async (id) => {
          const index = participants.findIndex((candidate) => candidate.id === id);
          if (index < 0) return false;
          participants.splice(index, 1);
          return true;
        },
        regenerateInvitation: async (id, invitationToken) => {
          const participant = participants.find((candidate) => candidate.id === id)!;
          participant.invitationToken = invitationToken;
          return participant;
        },
        findParticipantByInvitation: async (invitationToken) => participants.find((candidate) => candidate.invitationToken === invitationToken) ?? null,
      }),
    });

    const alice = await service.addParticipant("  Alice  ");
    expect(alice).toMatchObject({ displayLabel: "Alice", invitationToken: expect.stringMatching(/^[A-Za-z0-9_-]{8}$/) });
    await expect(service.addParticipant("alice")).rejects.toThrow("används redan");
    await expect(service.addParticipant(" ")).rejects.toThrow("får inte vara tomt");

    const originalToken = alice.invitationToken;
    const renewed = await service.regenerateInvitation(alice.id);
    await expect(service.findParticipantByInvitation(originalToken)).resolves.toBeNull();
    await expect(service.findParticipantByInvitation(renewed.invitationToken)).resolves.toMatchObject({ displayLabel: "Alice" });
    await service.renameParticipant(alice.id, "Ada");
    await service.removeParticipant(alice.id);
    await expect(service.findParticipantByInvitation(renewed.invitationToken)).resolves.toBeNull();
  });

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
        ...noParticipants,
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
      transaction: async <T,>(operation: (transaction: NameElectionTransaction) => Promise<T>) => operation({
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
        ...noParticipants,
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
        ...noParticipants,
      }),
    });
    const imported = Array.from({ length: 32 }, (_, position) => ({ suggestion: `Name ${position + 1}`, motivation: `Why ${position + 1}` }));

    await expect(service.replaceSuggestions(imported)).rejects.toThrow("only be changed during Draft");
    await expect(service.reorderSuggestions([])).rejects.toThrow("only be changed during Draft");
  });
});
