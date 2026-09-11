import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { approvalChoices, elections, participants, singletonElectionId, suggestions } from "@/server/db/schema";
import type { ApprovalChoice, ApprovalState, NameElectionStore } from "./service";

export const postgresNameElectionStore: NameElectionStore = {
  transaction: (operation) => db.transaction(async (transaction) => {
    const listSuggestions = () => transaction.select({
      id: suggestions.id,
      position: suggestions.position,
      suggestion: suggestions.suggestion,
      motivation: suggestions.motivation,
    }).from(suggestions).where(eq(suggestions.electionId, singletonElectionId)).orderBy(asc(suggestions.position));
    const listParticipants = () => transaction.select({
      id: participants.id,
      displayLabel: participants.displayLabel,
      invitationToken: participants.invitationToken,
      lastActivityAt: participants.lastActivityAt,
    }).from(participants).where(eq(participants.electionId, singletonElectionId)).orderBy(asc(participants.id));
    const state = async (): Promise<ApprovalState> => {
      const election = await transaction.query.elections.findFirst();
      const all = await listSuggestions();
      if (!election) throw new Error("Namnvalet finns inte");
      return { id: election.id, phase: election.phase, revealFrontier: election.revealFrontier, presentationPosition: election.presentationPosition, suggestionCount: all.length };
    };
    return operation({
    findElection: async () => {
      const election = await transaction.query.elections.findFirst();
      return election ? { id: election.id, phase: election.phase, revealFrontier: election.revealFrontier, presentationPosition: election.presentationPosition } : null;
    },
    insertDraftElection: async () => {
      const [election] = await transaction.insert(elections).values({ id: singletonElectionId, phase: "draft" }).onConflictDoNothing().returning();
      if (!election) {
        const existing = await transaction.query.elections.findFirst();
        if (!existing) throw new Error("The Draft Name Election could not be established");
        return { id: existing.id, phase: existing.phase };
      }
      return { id: election.id, phase: election.phase, revealFrontier: election.revealFrontier, presentationPosition: election.presentationPosition };
    },
    listSuggestions,
    replaceSuggestions: async (nextSuggestions) => {
      await transaction.delete(suggestions).where(eq(suggestions.electionId, singletonElectionId));
      await transaction.insert(suggestions).values(nextSuggestions.map((suggestion, position) => ({ ...suggestion, position, electionId: singletonElectionId })));
      return listSuggestions();
    },
    reorderSuggestions: async (ids) => {
      await transaction.update(suggestions).set({ position: sql`${suggestions.position} + ${ids.length}` }).where(eq(suggestions.electionId, singletonElectionId));
      await Promise.all(ids.map((id, position) => transaction.update(suggestions).set({ position }).where(eq(suggestions.id, id))));
      return listSuggestions();
    },
    listParticipants,
    insertParticipant: async (displayLabel, invitationToken) => {
      const [participant] = await transaction.insert(participants).values({ electionId: singletonElectionId, displayLabel, invitationToken }).returning();
      if (!participant) throw new Error("The Participant could not be created");
      return participant;
    },
    renameParticipant: async (id, displayLabel) => {
      const [participant] = await transaction.update(participants).set({ displayLabel }).where(eq(participants.id, id)).returning();
      return participant ?? null;
    },
    removeParticipant: async (id) => (await transaction.delete(participants).where(eq(participants.id, id)).returning({ id: participants.id })).length === 1,
    regenerateInvitation: async (id, invitationToken) => {
      const [participant] = await transaction.update(participants).set({ invitationToken }).where(eq(participants.id, id)).returning();
      return participant ?? null;
    },
    findParticipantByInvitation: async (invitationToken) => {
      const participant = await transaction.query.participants.findFirst({ where: eq(participants.invitationToken, invitationToken) });
      return participant ?? null;
    },
    openApprovalRound: async () => {
      const current = await state();
      if (current.phase === "approval-open" || current.phase === "approval-closed") return current;
      const [updated] = await transaction.update(elections).set({ phase: "approval-open", revealFrontier: -1, presentationPosition: -1, stateVersion: sql`${elections.stateVersion} + 1`, updatedAt: new Date() }).where(eq(elections.id, singletonElectionId)).returning();
      if (!updated) throw new Error("Approval Round kunde inte öppnas");
      return state();
    },
    revealNext: async () => {
      const current = await state();
      if (current.revealFrontier >= current.suggestionCount - 1) throw new Error("Alla Suggestions är redan avslöjade");
      const next = current.revealFrontier + 1;
      await transaction.update(elections).set({ revealFrontier: next, presentationPosition: current.presentationPosition < 0 ? next : current.presentationPosition, stateVersion: sql`${elections.stateVersion} + 1`, updatedAt: new Date() }).where(eq(elections.id, singletonElectionId));
      return state();
    },
    movePresentation: async (position) => {
      await transaction.update(elections).set({ presentationPosition: position, stateVersion: sql`${elections.stateVersion} + 1`, updatedAt: new Date() }).where(eq(elections.id, singletonElectionId));
      return state();
    },
    listApprovalChoices: async (participantId) => transaction.select({ suggestionId: approvalChoices.suggestionId, participantId: approvalChoices.participantId, choice: approvalChoices.choice }).from(approvalChoices).where(participantId === undefined ? eq(approvalChoices.electionId, singletonElectionId) : sql`${approvalChoices.electionId} = ${singletonElectionId}::uuid AND ${approvalChoices.participantId} = ${participantId}`),
    saveApprovalChoice: async (participantId, suggestionId, choice: ApprovalChoice) => {
      await transaction.insert(approvalChoices).values({ electionId: singletonElectionId, participantId, suggestionId, choice, updatedAt: new Date() }).onConflictDoUpdate({ target: [approvalChoices.participantId, approvalChoices.suggestionId], set: { choice, updatedAt: new Date() } });
      await transaction.update(participants).set({ lastActivityAt: new Date() }).where(eq(participants.id, participantId));
    },
    });
  }),
};
