import { NextResponse } from "next/server";
import { nameElectionService } from "@/server/name-election";

export const dynamic = "force-dynamic";

export async function GET() {
  const election = await nameElectionService.getDraft();
  const suggestions = await nameElectionService.listSuggestions();
  return NextResponse.json(suggestions.find((suggestion) => suggestion.position === (election?.presentationPosition ?? -1)) ?? null, { headers: { "Cache-Control": "no-store" } });
}
