export type NameElection = { id: string; phase: string };

export type DraftNameElection = NameElection;

export type Suggestion = {
  id: number;
  position: number;
  suggestion: string;
  motivation: string;
};

export type NewSuggestion = Pick<Suggestion, "suggestion" | "motivation">;

export type NameElectionTransaction = {
  findElection(): Promise<DraftNameElection | null>;
  insertDraftElection(): Promise<DraftNameElection>;
  listSuggestions(): Promise<Suggestion[]>;
  replaceSuggestions(suggestions: NewSuggestion[]): Promise<Suggestion[]>;
  reorderSuggestions(ids: number[]): Promise<Suggestion[]>;
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

/** The sole application-service boundary for Name Election commands and queries. */
export function createNameElectionService(store: NameElectionStore): NameElectionService {
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
  };
}
import { z } from "zod";
