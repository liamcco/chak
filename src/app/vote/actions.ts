"use server";
import { nameElectionService } from "@/server/name-election";
export async function saveApprovalChoice(token: string, suggestionId: number, choice: "yay" | "nay") { return nameElectionService.saveApprovalChoice(token, suggestionId, choice); }
export async function getApproval(token: string) { return nameElectionService.getApprovalForInvitation(token); }
export async function saveFinalAllocation(token: string, suggestionId: number, voteTokens: number) { return nameElectionService.saveFinalAllocation(token, suggestionId, voteTokens); }
export async function getFinalVote(token: string) { return nameElectionService.getFinalVoteForInvitation(token); }
