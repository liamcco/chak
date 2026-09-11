import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { approvalChoices, elections, finalVotes, participants, resultSnapshots, runoffChoices, runoffRounds, singletonElectionId, suggestions } from "@/server/db/schema";
import type { ApprovalChoice, ApprovalState, FinalistPreparation, NameElectionStore, ResultExport } from "./service";

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
      return election ? { id: election.id, phase: election.phase, revealFrontier: election.revealFrontier, presentationPosition: election.presentationPosition, finalistIds: election.finalistIds, voteTokenAllowance: election.voteTokenAllowance, winnerSuggestionId: election.winnerSuggestionId, winnerSuggestionIds: election.winnerSuggestionIds, resultRevealedAt: election.resultRevealedAt } : null;
    },
    insertDraftElection: async () => {
      const [election] = await transaction.insert(elections).values({ id: singletonElectionId, phase: "draft" }).onConflictDoNothing().returning();
      if (!election) {
        const existing = await transaction.query.elections.findFirst();
        if (!existing) throw new Error("The Draft Name Election could not be established");
        return { id: existing.id, phase: existing.phase };
      }
      return { id: election.id, phase: election.phase, revealFrontier: election.revealFrontier, presentationPosition: election.presentationPosition, finalistIds: election.finalistIds, voteTokenAllowance: election.voteTokenAllowance, winnerSuggestionId: election.winnerSuggestionId, winnerSuggestionIds: election.winnerSuggestionIds, resultRevealedAt: election.resultRevealedAt };
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
    closeApprovalRound: async () => {
      await transaction.update(elections).set({ phase: "approval-closed", stateVersion: sql`${elections.stateVersion} + 1`, updatedAt: new Date() }).where(eq(elections.id, singletonElectionId));
      return state();
    },
    saveFinalistPreparation: async (preparation: FinalistPreparation) => {
      const [updated] = await transaction.update(elections).set({ phase: preparation.winnerSuggestionId ? "complete" : "final-prepared", finalistIds: preparation.finalistIds, voteTokenAllowance: preparation.voteTokenAllowance, winnerSuggestionId: preparation.winnerSuggestionId ?? null, winnerSuggestionIds: preparation.winnerSuggestionId ? preparation.finalistIds : null, stateVersion: sql`${elections.stateVersion} + 1`, updatedAt: new Date() }).where(eq(elections.id, singletonElectionId)).returning();
      if (!updated) throw new Error("Finalistkonfigurationen kunde inte sparas");
      return { id: updated.id, phase: updated.phase, revealFrontier: updated.revealFrontier, presentationPosition: updated.presentationPosition, finalistIds: updated.finalistIds, voteTokenAllowance: updated.voteTokenAllowance, winnerSuggestionId: updated.winnerSuggestionId, winnerSuggestionIds: updated.winnerSuggestionIds };
    },
    saveFinalAllocation: async (participantId, suggestionId, voteTokens) => {
      await transaction.insert(finalVotes).values({ electionId: singletonElectionId, participantId, suggestionId, voteTokens, updatedAt: new Date() }).onConflictDoUpdate({ target: [finalVotes.participantId, finalVotes.suggestionId], set: { voteTokens, updatedAt: new Date() } });
      await transaction.update(participants).set({ lastActivityAt: new Date() }).where(eq(participants.id, participantId));
    },
    listFinalAllocations: async (participantId) => transaction.select({ participantId: finalVotes.participantId, suggestionId: finalVotes.suggestionId, voteTokens: finalVotes.voteTokens }).from(finalVotes).where(participantId === undefined ? eq(finalVotes.electionId, singletonElectionId) : sql`${finalVotes.electionId} = ${singletonElectionId}::uuid AND ${finalVotes.participantId} = ${participantId}`),
    openFinalVote: async () => {
      const [updated] = await transaction.update(elections).set({ phase: "final-open", stateVersion: sql`${elections.stateVersion} + 1`, updatedAt: new Date() }).where(eq(elections.id, singletonElectionId)).returning();
      if (!updated) throw new Error("Final Vote kunde inte öppnas");
      return { id: updated.id, phase: updated.phase, finalistIds: updated.finalistIds, voteTokenAllowance: updated.voteTokenAllowance, winnerSuggestionId: updated.winnerSuggestionId };
    },
    closeFinalVote: async (finalistIds) => {
      const [updated] = await transaction.update(elections).set({ phase: "final-closed", finalistIds, stateVersion: sql`${elections.stateVersion} + 1`, updatedAt: new Date() }).where(eq(elections.id, singletonElectionId)).returning();
      if (!updated) throw new Error("Final Vote kunde inte stängas");
      return { id: updated.id, phase: updated.phase, finalistIds: updated.finalistIds, voteTokenAllowance: updated.voteTokenAllowance, winnerSuggestionId: updated.winnerSuggestionId, winnerSuggestionIds: updated.winnerSuggestionIds };
    },
    createRunoffRound: async (finalistIds, roundNumber) => {
      const [round] = await transaction.insert(runoffRounds).values({ electionId: singletonElectionId, finalistIds, roundNumber, status: "open" }).returning();
      if (!round) throw new Error("Runoff kunde inte öppnas");
      await transaction.update(elections).set({ phase: "runoff-open", stateVersion: sql`${elections.stateVersion} + 1`, updatedAt: new Date() }).where(eq(elections.id, singletonElectionId));
      return { id: round.id, roundNumber: round.roundNumber, finalistIds: round.finalistIds, status: "open" as const, winnerIds: round.winnerIds };
    },
    findOpenRunoff: async () => {
      const round = await transaction.query.runoffRounds.findFirst({ orderBy: (table, { desc }) => [desc(table.roundNumber)] });
      return round ? { id: round.id, roundNumber: round.roundNumber, finalistIds: round.finalistIds, status: round.status as "open" | "closed", winnerIds: round.winnerIds } : null;
    },
    listRunoffChoices: async (roundId) => transaction.select({ roundId: runoffChoices.roundId, participantId: runoffChoices.participantId, suggestionId: runoffChoices.suggestionId }).from(runoffChoices).where(roundId === undefined ? sql`${runoffChoices.roundId} IN (SELECT id FROM runoff_rounds WHERE election_id = ${singletonElectionId}::uuid)` : eq(runoffChoices.roundId, roundId)),
    saveRunoffChoice: async (roundId, participantId, suggestionId) => {
      await transaction.insert(runoffChoices).values({ roundId, participantId, suggestionId, updatedAt: new Date() }).onConflictDoUpdate({ target: [runoffChoices.roundId, runoffChoices.participantId], set: { suggestionId, updatedAt: new Date() } });
      await transaction.update(participants).set({ lastActivityAt: new Date() }).where(eq(participants.id, participantId));
    },
    closeRunoff: async (roundId, winnerIds) => {
      const [round] = await transaction.update(runoffRounds).set({ status: "closed", winnerIds }).where(eq(runoffRounds.id, roundId)).returning();
      if (!round) throw new Error("Runoff kunde inte stängas");
      await transaction.update(elections).set({ phase: winnerIds.length === 1 ? "complete" : "runoff-closed", winnerSuggestionId: winnerIds.length === 1 ? winnerIds[0] : null, winnerSuggestionIds: winnerIds.length === 1 ? winnerIds : null, stateVersion: sql`${elections.stateVersion} + 1`, updatedAt: new Date() }).where(eq(elections.id, singletonElectionId));
      return { id: round.id, roundNumber: round.roundNumber, finalistIds: round.finalistIds, status: "closed" as const, winnerIds: round.winnerIds };
    },
    revealResult: async () => {
      const [updated] = await transaction.update(elections).set({ resultRevealedAt: new Date(), stateVersion: sql`${elections.stateVersion} + 1`, updatedAt: new Date() }).where(eq(elections.id, singletonElectionId)).returning();
      if (!updated) throw new Error("Result Reveal kunde inte publiceras");
      return { id: updated.id, phase: updated.phase, finalistIds: updated.finalistIds, winnerSuggestionId: updated.winnerSuggestionId, winnerSuggestionIds: updated.winnerSuggestionIds, resultRevealedAt: updated.resultRevealedAt };
    },
    getResultData: async () => {
      const election = await transaction.query.elections.findFirst();
      if (!election) throw new Error("Namnvalet finns inte");
      const allocations = await transaction.select({ participantId: finalVotes.participantId, suggestionId: finalVotes.suggestionId, voteTokens: finalVotes.voteTokens }).from(finalVotes).where(eq(finalVotes.electionId, singletonElectionId));
      const roster = await listParticipants();
      const completedParticipantIds = roster.filter((p) => allocations.filter((a) => a.participantId === p.id).reduce((sum, a) => sum + a.voteTokens, 0) === election.voteTokenAllowance).map((p) => p.id);
      return { election: { id: election.id, phase: election.phase, finalistIds: election.finalistIds, voteTokenAllowance: election.voteTokenAllowance, winnerSuggestionId: election.winnerSuggestionId, winnerSuggestionIds: election.winnerSuggestionIds, resultRevealedAt: election.resultRevealedAt }, suggestions: await listSuggestions(), allocations, participantCount: roster.length, completedParticipantIds, approvalChoices: await transaction.select({ suggestionId: approvalChoices.suggestionId, participantId: approvalChoices.participantId, choice: approvalChoices.choice }).from(approvalChoices).where(eq(approvalChoices.electionId, singletonElectionId)), runoffChoices: await transaction.select({ roundId: runoffChoices.roundId, participantId: runoffChoices.participantId, suggestionId: runoffChoices.suggestionId }).from(runoffChoices).where(sql`${runoffChoices.roundId} IN (SELECT id FROM runoff_rounds WHERE election_id = ${singletonElectionId}::uuid)`) };
    },
    getResultSnapshot: async () => {
      const snapshot = await transaction.query.resultSnapshots.findFirst({ where: eq(resultSnapshots.electionId, singletonElectionId) });
      return (snapshot?.payload as ResultExport | undefined) ?? null;
    },
    saveSnapshotAndErase: async (snapshot: ResultExport) => {
      await transaction.insert(resultSnapshots).values({ electionId: singletonElectionId, payload: snapshot }).onConflictDoNothing();
      const saved = await transaction.query.resultSnapshots.findFirst({ where: eq(resultSnapshots.electionId, singletonElectionId) });
      if (!saved || JSON.stringify(saved.payload) !== JSON.stringify(snapshot)) throw new Error("Aggregate snapshot verification failed");
      await transaction.delete(participants).where(eq(participants.electionId, singletonElectionId));
    },
    });
  }),
};
