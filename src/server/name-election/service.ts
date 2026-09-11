import { randomBytes } from "node:crypto";
import { z } from "zod";

export type NameElection = { id: string; phase: string };

export type DraftNameElection = NameElection;

export type Suggestion = {
  id: number;
  position: number;
  suggestion: string;
  motivation: string;
};

export type NewSuggestion = Pick<Suggestion, "suggestion" | "motivation">;

export type Participant = {
  id: number;
  displayLabel: string;
  invitationToken: string;
};

export type NameElectionTransaction = {
  findElection(): Promise<DraftNameElection | null>;
  insertDraftElection(): Promise<DraftNameElection>;
  listSuggestions(): Promise<Suggestion[]>;
  replaceSuggestions(suggestions: NewSuggestion[]): Promise<Suggestion[]>;
  reorderSuggestions(ids: number[]): Promise<Suggestion[]>;
  listParticipants(): Promise<Participant[]>;
  insertParticipant(displayLabel: string, invitationToken: string): Promise<Participant>;
  renameParticipant(id: number, displayLabel: string): Promise<Participant | null>;
  removeParticipant(id: number): Promise<boolean>;
  regenerateInvitation(id: number, invitationToken: string): Promise<Participant | null>;
  findParticipantByInvitation(invitationToken: string): Promise<Participant | null>;
};

export type NameElectionStore = {
  transaction<T>(operation: (transaction: NameElectionTransaction) => Promise<T>): Promise<T>;
};

export type NameElectionService = {
  establishDraft(): Promise<DraftNameElection>;
  getDraft(): Promise<DraftNameElection | null>;
  listSuggestions(): Promise<Suggestion[]>;
  replaceSuggestions(suggestions: NewSuggestion[]): Promise<Suggestion[]>;
  reorderSuggestions(ids: number[]): Promise<Suggestion[]>;
  listParticipants(): Promise<Participant[]>;
  addParticipant(displayLabel: string): Promise<Participant>;
  renameParticipant(id: number, displayLabel: string): Promise<Participant>;
  removeParticipant(id: number): Promise<void>;
  regenerateInvitation(id: number): Promise<Participant>;
  findParticipantByInvitation(invitationToken: string): Promise<Participant | null>;
};

const suggestionCount = 32;

function validateSuggestions(suggestions: NewSuggestion[]) {
  const parsed = z.array(z.object({ suggestion: z.string(), motivation: z.string() })).safeParse(suggestions);
  if (!parsed.success) throw new Error("Every Suggestion and motivation must be text");
  if (parsed.data.length !== suggestionCount) throw new Error(`The Name Election needs exactly ${suggestionCount} Suggestions`);
  if (parsed.data.some(({ suggestion, motivation }) => !suggestion.trim() || !motivation.trim())) {
    throw new Error("Every Suggestion and motivation must be filled in");
  }
  return parsed.data;
}

function validateDisplayLabel(displayLabel: string) {
  if (typeof displayLabel !== "string") throw new Error("Deltagarnamnet måste vara text");
  const trimmed = displayLabel.trim();
  if (!trimmed) throw new Error("Deltagarnamnet får inte vara tomt");
  return trimmed;
}

function sameDisplayLabel(left: string, right: string) {
  return left.localeCompare(right, "sv", { sensitivity: "accent" }) === 0;
}

function createInvitationToken() {
  return randomBytes(6).toString("base64url");
}

function isUniqueViolation(error: unknown, constraint: string) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505" && "constraint" in error && error.constraint === constraint;
}

const displayLabelConstraints = ["participants_election_display_label_unique", "participants_election_display_label_normalized_unique"];

function isDisplayLabelConflict(error: unknown) {
  return displayLabelConstraints.some((constraint) => isUniqueViolation(error, constraint));
}

async function requireDraftParticipantRoster(transaction: NameElectionTransaction) {
  const election = await transaction.findElection();
  if (!election || election.phase !== "draft") throw new Error("Deltagare kan bara ändras under utkast");
}

/** The sole application-service boundary for Name Election commands and queries. */
export function createNameElectionService(store: NameElectionStore): NameElectionService {
  async function persistWithUniqueInvitationToken<T>(operation: (transaction: NameElectionTransaction, invitationToken: string) => Promise<T>) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        return await store.transaction((transaction) => operation(transaction, createInvitationToken()));
      } catch (error) {
        if (!isUniqueViolation(error, "participants_invitation_token_unique")) throw error;
      }
    }
    throw new Error("Kunde inte skapa en unik inbjudningslänk");
  }

  return {
    establishDraft: () => store.transaction(async (transaction) =>
      (await transaction.findElection()) ?? transaction.insertDraftElection(),
    ),
    getDraft: () => store.transaction((transaction) => transaction.findElection()),
    listSuggestions: () => store.transaction((transaction) => transaction.listSuggestions()),
    replaceSuggestions: (suggestions) => store.transaction(async (transaction) => {
      const election = await transaction.findElection();
      if (!election || election.phase !== "draft") throw new Error("Suggestions can only be changed during Draft");
      return transaction.replaceSuggestions(validateSuggestions(suggestions));
    }),
    reorderSuggestions: (ids) => store.transaction(async (transaction) => {
      const election = await transaction.findElection();
      if (!election || election.phase !== "draft") throw new Error("Suggestions can only be changed during Draft");
      const existing = await transaction.listSuggestions();
      if (ids.length !== existing.length || new Set(ids).size !== ids.length || ids.some((id) => !existing.some((suggestion) => suggestion.id === id))) {
        throw new Error("The Suggestion order is invalid");
      }
      return transaction.reorderSuggestions(ids);
    }),
    listParticipants: () => store.transaction((transaction) => transaction.listParticipants()),
    addParticipant: async (displayLabel) => {
      const validatedDisplayLabel = validateDisplayLabel(displayLabel);
      try {
        return await persistWithUniqueInvitationToken(async (transaction, invitationToken) => {
          await requireDraftParticipantRoster(transaction);
          const participants = await transaction.listParticipants();
          if (participants.some((participant) => sameDisplayLabel(participant.displayLabel, validatedDisplayLabel))) {
            throw new Error("Deltagarnamnet används redan");
          }
          return transaction.insertParticipant(validatedDisplayLabel, invitationToken);
        });
      } catch (error) {
        if (isDisplayLabelConflict(error)) throw new Error("Deltagarnamnet används redan");
        throw error;
      }
    },
    renameParticipant: (id, displayLabel) => store.transaction(async (transaction) => {
      await requireDraftParticipantRoster(transaction);
      const validatedDisplayLabel = validateDisplayLabel(displayLabel);
      const participants = await transaction.listParticipants();
      if (participants.some((participant) => participant.id !== id && sameDisplayLabel(participant.displayLabel, validatedDisplayLabel))) {
        throw new Error("Deltagarnamnet används redan");
      }
      try {
        const participant = await transaction.renameParticipant(id, validatedDisplayLabel);
        if (!participant) throw new Error("Deltagaren finns inte");
        return participant;
      } catch (error) {
        if (isDisplayLabelConflict(error)) throw new Error("Deltagarnamnet används redan");
        throw error;
      }
    }),
    removeParticipant: (id) => store.transaction(async (transaction) => {
      await requireDraftParticipantRoster(transaction);
      if (!(await transaction.removeParticipant(id))) throw new Error("Deltagaren finns inte");
    }),
    regenerateInvitation: (id) => persistWithUniqueInvitationToken(async (transaction, invitationToken) => {
      await requireDraftParticipantRoster(transaction);
      const participant = await transaction.regenerateInvitation(id, invitationToken);
      if (!participant) throw new Error("Deltagaren finns inte");
      return participant;
    }),
    findParticipantByInvitation: (invitationToken) => store.transaction((transaction) => transaction.findParticipantByInvitation(invitationToken)),
  };
}
