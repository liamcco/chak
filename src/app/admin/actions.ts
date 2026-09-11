"use server";

import { redirect } from "next/navigation";
import { requireAdministrator, signOut } from "@/server/auth/admin";
import { nameElectionService } from "@/server/name-election";
import type { NewSuggestion } from "@/server/name-election/service";

export async function logout() { await signOut(); redirect("/"); }

export async function replaceSuggestions(suggestions: NewSuggestion[]) {
  await requireAdministrator();
  return nameElectionService.replaceSuggestions(suggestions);
}

export async function reorderSuggestions(ids: number[]) {
  await requireAdministrator();
  return nameElectionService.reorderSuggestions(ids);
}

export async function addParticipant(displayLabel: string) {
  await requireAdministrator();
  return nameElectionService.addParticipant(displayLabel);
}

export async function renameParticipant(id: number, displayLabel: string) {
  await requireAdministrator();
  return nameElectionService.renameParticipant(id, displayLabel);
}

export async function removeParticipant(id: number) {
  await requireAdministrator();
  return nameElectionService.removeParticipant(id);
}

export async function regenerateInvitation(id: number) {
  await requireAdministrator();
  return nameElectionService.regenerateInvitation(id);
}

export async function openApprovalRound() { await requireAdministrator(); return nameElectionService.openApprovalRound(); }
export async function revealNextSuggestion() { await requireAdministrator(); return nameElectionService.revealNext(); }
export async function movePresentation(position: number) { await requireAdministrator(); return nameElectionService.movePresentation(position); }
export async function closeApprovalRound(incompleteParticipantIds: number[] = []) { await requireAdministrator(); return nameElectionService.closeApprovalRound(incompleteParticipantIds); }
export async function prepareFinalVote(suggestionIds: number[], voteTokenAllowance: number) { await requireAdministrator(); return nameElectionService.prepareFinalVote(suggestionIds, voteTokenAllowance); }
export async function declareWinner(suggestionId: number) { await requireAdministrator(); return nameElectionService.declareWinner(suggestionId); }
