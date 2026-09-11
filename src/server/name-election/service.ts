import { randomBytes } from "node:crypto";
import { z } from "zod";

export type ApprovalChoice = "yay" | "nay";
export type NameElection = { id: string; phase: string; revealFrontier?: number; presentationPosition?: number; finalistIds?: number[]; voteTokenAllowance?: number; winnerSuggestionId?: number | null };

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
  lastActivityAt?: Date | null;
};

export type ApprovalState = NameElection & { revealFrontier: number; presentationPosition: number; suggestionCount: number };
export type ApprovalSuggestion = Suggestion & { responseCount?: number; choice?: ApprovalChoice | null };
export type ApprovalParticipantProgress = {
  participantId: number;
  displayLabel: string;
  invitationStatus: "active";
  lastActivityAt: Date | null;
  completionState: "not-started" | "in-progress" | "complete";
};
export type ApprovalOverview = ApprovalState & {
  answeredCount: number;
  fullyCaughtUpCount: number;
  participants: ApprovalParticipantProgress[];
};
export type ApprovalResult = Suggestion & { yayCount: number; nayCount: number; unansweredCount: number; approvalScore: number };
export type FinalistPreparation = { finalistIds: number[]; voteTokenAllowance: number; winnerSuggestionId?: number | null };

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
  openApprovalRound?(): Promise<ApprovalState>;
  revealNext?(): Promise<ApprovalState>;
  movePresentation?(position: number): Promise<ApprovalState>;
  listApprovalChoices?(participantId?: number): Promise<{ suggestionId: number; participantId: number; choice: ApprovalChoice }[]>;
  saveApprovalChoice?(participantId: number, suggestionId: number, choice: ApprovalChoice): Promise<void>;
  getApprovalOverview?(): Promise<ApprovalOverview>;
  closeApprovalRound?(): Promise<ApprovalState>;
  saveFinalistPreparation?(preparation: FinalistPreparation): Promise<NameElection>;
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
  openApprovalRound(): Promise<ApprovalState>;
  revealNext(): Promise<ApprovalState>;
  movePresentation(position: number): Promise<ApprovalState>;
  getApprovalForInvitation(invitationToken: string): Promise<{ state: ApprovalState; participant: Participant; suggestions: ApprovalSuggestion[]; position: number } | null>;
  getApprovalOverview(): Promise<ApprovalOverview>;
  getApprovalResults(): Promise<ApprovalResult[]>;
  closeApprovalRound(incompleteParticipantIds?: number[]): Promise<ApprovalOverview>;
  prepareFinalVote(suggestionIds: number[], voteTokenAllowance?: number): Promise<FinalistPreparation>;
  declareWinner(suggestionId: number): Promise<FinalistPreparation>;
  saveApprovalChoice(invitationToken: string, suggestionId: number, choice: ApprovalChoice): Promise<void>;
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

  async function approvalState(transaction: NameElectionTransaction): Promise<ApprovalState> {
    const election = await transaction.findElection();
    if (!election) throw new Error("Namnvalet finns inte");
    const all = await transaction.listSuggestions();
    return { id: election.id, phase: election.phase, revealFrontier: election.revealFrontier ?? -1, presentationPosition: election.presentationPosition ?? -1, suggestionCount: all.length };
  }

  function requireApprovalMethods(transaction: NameElectionTransaction) {
    if (!transaction.openApprovalRound || !transaction.revealNext || !transaction.movePresentation || !transaction.listApprovalChoices || !transaction.saveApprovalChoice) throw new Error("Approval Round is not available");
    return transaction;
  }

  function approvalResults(suggestions: Suggestion[], choices: { suggestionId: number; participantId?: number; choice: ApprovalChoice }[], participantCount: number): ApprovalResult[] {
    const bySuggestion = new Map<number, { yayCount: number; nayCount: number }>();
    for (const choice of choices) {
      const count = bySuggestion.get(choice.suggestionId) ?? { yayCount: 0, nayCount: 0 };
      count[choice.choice === "yay" ? "yayCount" : "nayCount"] += 1;
      bySuggestion.set(choice.suggestionId, count);
    }
    return suggestions.map((suggestion) => {
      const { yayCount, nayCount } = bySuggestion.get(suggestion.id) ?? { yayCount: 0, nayCount: 0 };
      const submitted = yayCount + nayCount;
      return { ...suggestion, yayCount, nayCount, unansweredCount: Math.max(0, participantCount - submitted), approvalScore: submitted ? yayCount / submitted : 0 };
    }).sort((left, right) => right.yayCount - left.yayCount || right.approvalScore - left.approvalScore || left.position - right.position);
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
    openApprovalRound: () => store.transaction(async (transaction) => {
      const election = await transaction.findElection();
      if (!election) throw new Error("Namnvalet finns inte");
      if (election.phase === "approval-open" || election.phase === "approval-closed") return approvalState(transaction);
      if (election.phase !== "draft") throw new Error("Approval Round kan bara öppnas från Draft");
      if (!(await transaction.listParticipants()).length) throw new Error("Minst en Participant krävs");
      if ((await transaction.listSuggestions()).length !== suggestionCount) throw new Error("Alla 32 Suggestions krävs");
      const t = requireApprovalMethods(transaction);
      return t.openApprovalRound!();
    }),
    revealNext: () => store.transaction(async (transaction) => {
      const election = await transaction.findElection();
      if (!election || election.phase !== "approval-open") throw new Error("Suggestions kan bara avslöjas under Approval Round");
      return requireApprovalMethods(transaction).revealNext!();
    }),
    movePresentation: (position) => store.transaction(async (transaction) => {
      const state = await approvalState(transaction);
      if (state.phase !== "approval-open") throw new Error("Presentation är inte öppen");
      if (!Number.isInteger(position) || position < 0 || position > state.revealFrontier) throw new Error("Presentation Position är ogiltig");
      return requireApprovalMethods(transaction).movePresentation!(position);
    }),
    getApprovalForInvitation: (invitationToken) => store.transaction(async (transaction) => {
      const participant = await transaction.findParticipantByInvitation(invitationToken);
      if (!participant) return null;
      const state = await approvalState(transaction);
      const choices = transaction.listApprovalChoices ? await transaction.listApprovalChoices(participant.id) : [];
      const choiceBySuggestion = new Map(choices.map((choice) => [choice.suggestionId, choice.choice]));
      const suggestions = (await transaction.listSuggestions()).filter((suggestion) => suggestion.position <= state.revealFrontier).map((suggestion) => ({ ...suggestion, choice: choiceBySuggestion.get(suggestion.id) ?? null }));
      const firstUnanswered = suggestions.findIndex((suggestion) => suggestion.choice === null);
      return { state, participant, suggestions, position: firstUnanswered >= 0 ? firstUnanswered : Math.max(0, Math.min(state.presentationPosition, suggestions.length - 1)) };
    }),
    getApprovalOverview: () => store.transaction(async (transaction) => {
      const state = await approvalState(transaction);
      const roster = await transaction.listParticipants();
      const choices = transaction.listApprovalChoices ? await transaction.listApprovalChoices() : [];
      const revealedCount = Math.max(0, state.revealFrontier + 1);
      const presentationSuggestion = (await transaction.listSuggestions()).find((suggestion) => suggestion.position === state.presentationPosition);
      const answeredCount = presentationSuggestion ? choices.filter((choice) => choice.suggestionId === presentationSuggestion.id).length : 0;
      const counts = new Map<number, number>();
      for (const choice of choices) counts.set(choice.participantId, (counts.get(choice.participantId) ?? 0) + 1);
      return {
        ...state,
        answeredCount,
        fullyCaughtUpCount: revealedCount === 0 ? 0 : roster.filter((participant) => (counts.get(participant.id) ?? 0) >= revealedCount).length,
        participants: roster.map((participant) => {
          const count = counts.get(participant.id) ?? 0;
          return { participantId: participant.id, displayLabel: participant.displayLabel, invitationStatus: "active" as const, lastActivityAt: participant.lastActivityAt ?? null, completionState: count >= revealedCount && revealedCount > 0 ? "complete" as const : count > 0 ? "in-progress" as const : "not-started" as const };
        }),
      };
    }),
    getApprovalResults: () => store.transaction(async (transaction) => {
      const state = await approvalState(transaction);
      if (state.phase !== "approval-closed" && state.phase !== "final-prepared" && state.phase !== "complete") throw new Error("Approval Round är inte stängd");
      return approvalResults(await transaction.listSuggestions(), await transaction.listApprovalChoices!(), (await transaction.listParticipants()).length);
    }),
    closeApprovalRound: (confirmedIds = []) => store.transaction(async (transaction) => {
      const state = await approvalState(transaction);
      if (state.phase === "approval-closed" || state.phase === "final-prepared" || state.phase === "complete") {
        const roster = await transaction.listParticipants();
        const choices = await transaction.listApprovalChoices!();
        return { ...state, answeredCount: 0, fullyCaughtUpCount: 0, participants: roster.map((participant) => ({ participantId: participant.id, displayLabel: participant.displayLabel, invitationStatus: "active" as const, lastActivityAt: participant.lastActivityAt ?? null, completionState: choices.filter((choice) => choice.participantId === participant.id).length >= state.suggestionCount ? "complete" as const : choices.some((choice) => choice.participantId === participant.id) ? "in-progress" as const : "not-started" as const })) };
      }
      if (state.phase !== "approval-open") throw new Error("Approval Round kan inte stängas nu");
      if (state.revealFrontier < state.suggestionCount - 1) throw new Error("Alla Suggestions måste avslöjas innan Approval Round stängs");
      const roster = await transaction.listParticipants();
      const choices = await transaction.listApprovalChoices!();
      const incomplete = roster.filter((participant) => choices.filter((choice) => choice.participantId === participant.id).length < state.suggestionCount);
      const expected = incomplete.map(({ id }) => id).sort((a, b) => a - b);
      if (expected.join(",") !== [...confirmedIds].sort((a, b) => a - b).join(",")) throw new Error(`Bekräfta ofullständiga Ballots: ${incomplete.map(({ displayLabel }) => displayLabel).join(", ") || "inga"}`);
      await requireApprovalMethods(transaction).closeApprovalRound!();
      const next = await approvalState(transaction);
      return { ...next, answeredCount: 0, fullyCaughtUpCount: 0, participants: roster.map((participant) => ({ participantId: participant.id, displayLabel: participant.displayLabel, invitationStatus: "active" as const, lastActivityAt: participant.lastActivityAt ?? null, completionState: "complete" as const })) };
    }),
    prepareFinalVote: (suggestionIds, voteTokenAllowance = 3) => store.transaction(async (transaction) => {
      const state = await approvalState(transaction);
      if (state.phase !== "approval-closed") throw new Error("Finalister kan bara förberedas efter stängd Approval Round");
      const suggestions = await transaction.listSuggestions();
      if (!Number.isInteger(voteTokenAllowance) || voteTokenAllowance <= 0) throw new Error("Vote Token allowance måste vara ett positivt heltal");
      if (suggestionIds.length < 2 || suggestionIds.length > 10 || new Set(suggestionIds).size !== suggestionIds.length || suggestionIds.some((id) => !suggestions.some((suggestion) => suggestion.id === id))) throw new Error("Välj mellan två och tio Finalists");
      const saved = await transaction.saveFinalistPreparation!({ finalistIds: suggestionIds, voteTokenAllowance, winnerSuggestionId: null });
      return { finalistIds: saved.finalistIds ?? suggestionIds, voteTokenAllowance: saved.voteTokenAllowance ?? voteTokenAllowance, winnerSuggestionId: saved.winnerSuggestionId };
    }),
    declareWinner: (suggestionId) => store.transaction(async (transaction) => {
      const state = await approvalState(transaction);
      if (state.phase !== "approval-closed") throw new Error("Winner kan bara utses efter stängd Approval Round");
      const results = approvalResults(await transaction.listSuggestions(), await transaction.listApprovalChoices!(), (await transaction.listParticipants()).length);
      if (!results.some((result) => result.id === suggestionId)) throw new Error("Suggestion finns inte");
      return transaction.saveFinalistPreparation!({ finalistIds: [], voteTokenAllowance: 0, winnerSuggestionId: suggestionId }).then((saved) => ({ finalistIds: saved.finalistIds ?? [], voteTokenAllowance: saved.voteTokenAllowance ?? 0, winnerSuggestionId: saved.winnerSuggestionId }));
    }),
    saveApprovalChoice: (invitationToken, suggestionId, choice) => store.transaction(async (transaction) => {
      if (choice !== "yay" && choice !== "nay") throw new Error("Valet måste vara Ja eller Nej");
      const participant = await transaction.findParticipantByInvitation(invitationToken);
      if (!participant) throw new Error("Ogiltig inbjudan");
      const state = await approvalState(transaction);
      if (state.phase !== "approval-open") throw new Error("Approval Round är inte öppen");
      const suggestion = (await transaction.listSuggestions()).find((candidate) => candidate.id === suggestionId);
      if (!suggestion || suggestion.position > state.revealFrontier) throw new Error("Suggestion är inte avslöjad");
      return requireApprovalMethods(transaction).saveApprovalChoice!(participant.id, suggestionId, choice);
    }),
  };
}
