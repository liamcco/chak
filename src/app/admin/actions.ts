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
