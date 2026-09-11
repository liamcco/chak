import { nameElectionService } from "@/server/name-election";
import { Presentation } from "./presentation";
import { ResultReveal } from "../result";
export const dynamic = "force-dynamic";
export default async function PresentationPage() { const election = await nameElectionService.getDraft(); const result = await nameElectionService.getPublishedResult(); if (election?.phase === "complete") return <main className="presentation"><ResultReveal initial={result} /></main>; const suggestions = await nameElectionService.listSuggestions(); const current = suggestions.find((suggestion) => suggestion.position === (election?.presentationPosition ?? -1)) ?? null; return <Presentation initial={current} />; }
