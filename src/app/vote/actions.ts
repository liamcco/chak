"use server";
import { nameElectionService } from "@/server/name-election";
export async function saveApprovalChoice(token: string, suggestionId: number, choice: "yay" | "nay") { return nameElectionService.saveApprovalChoice(token, suggestionId, choice); }
